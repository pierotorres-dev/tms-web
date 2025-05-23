import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Guard que protege rutas accesibles solo para usuarios no autenticados
 * (como login, registro, recuperación de contraseña)
 */
export const nonAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.isAuthenticated().pipe(
    take(1),
    map(isAuth => {
      if (!isAuth) {
        // El usuario no está autenticado, permitir acceso
        return true;
      }
      
      // El usuario está autenticado, redirigir al dashboard
      return router.createUrlTree(['/dashboard']);
    })
  );
};
