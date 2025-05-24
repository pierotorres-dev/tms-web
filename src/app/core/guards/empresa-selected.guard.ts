import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { EmpresaContextService } from '../services/empresa-context.service';

/**
 * Guard que verifica si hay una empresa seleccionada antes de permitir acceso a una ruta
 * Si no hay empresa seleccionada, redirige a la página de selección de empresa
 */
@Injectable({
  providedIn: 'root'
})
export class EmpresaSelectedGuard implements CanActivate {
  private empresaContextService = inject(EmpresaContextService);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Verificar si hay una empresa seleccionada
    if (this.empresaContextService.hasSelectedEmpresa()) {
      return true;
    }

    // Si no hay empresa seleccionada, redirigir a la selección de empresa
    return this.router.createUrlTree(['/auth/select-empresa']);
  }

  /**
   * Versión reactiva del guard que escucha cambios en el estado de la empresa
   * Útil cuando la empresa puede cambiar dinámicamente
   */
  canActivateReactive(): Observable<boolean | UrlTree> {
    return this.empresaContextService.hasEmpresaSelected$.pipe(
      map(hasEmpresa => {
        if (hasEmpresa) {
          return true;
        }
        return this.router.createUrlTree(['/auth/select-empresa']);
      })
    );
  }
}
