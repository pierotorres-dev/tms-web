import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { TOKEN_STORAGE } from '../../features/auth/constants/auth.constants';
import { AuthService } from '../../features/auth/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Interceptor que añade el token de autenticación a las peticiones
 * y maneja los errores 401 para refrescar el token
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Solo añadimos el token para peticiones a nuestra API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  
  // No añadimos el token para login
  if (req.url.includes('/api/auth/login')) {
    return next(req);
  }
  
  const token = authService.getToken();
  
  if (token) {
    // Clonamos la request y añadimos el token
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    
    // Procesamos la request con el token
    return next(authReq).pipe(
      catchError((error) => {
        // Si es un error 401 y tenemos un token, intentamos refrescar
        if (error instanceof HttpErrorResponse && error.status === 401 && token) {
          return handleUnauthorizedError(authService, req, next, router);
        }
        
        return throwError(() => error);
      })
    );
  }
  
  // Si no hay token, continuamos sin modificar la request
  return next(req);
};

/**
 * Maneja los errores 401 (Unauthorized) intentando refrescar el token
 */
function handleUnauthorizedError(
  authService: AuthService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  router: Router
): Observable<HttpEvent<unknown>> {
  return authService.refreshToken().pipe(
    switchMap(response => {
      // Si tenemos un nuevo token, reintentamos la request
      if (response.token) {
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${response.token}`)
        });
        
        return next(authReq);
      }
      
      // Si no hay token, redirigimos al login
      authService.logout();
      router.navigate(['/auth/login']);
      
      return throwError(() => new Error('Session expired'));
    }),
    catchError(error => {
      // Si falla el refresh, cerramos sesión
      authService.logout();
      router.navigate(['/auth/login']);
      
      return throwError(() => error);
    })
  );
}
