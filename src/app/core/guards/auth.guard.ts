import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Guard que protege rutas para usuarios autenticados
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.isAuthenticated().pipe(
    take(1),
    map(isAuth => {
      if (isAuth) {
        // El usuario está autenticado, permitir acceso
        return true;
      }
      
      // El usuario no está autenticado, redirigir al login
      // Guardamos la URL a la que intentaba acceder para redirigir después del login
      return router.createUrlTree(['/auth/login'], { 
        queryParams: { returnUrl: state.url }
      });
    })
  );
};
