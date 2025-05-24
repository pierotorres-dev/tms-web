import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, filter } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { EmpresaInfo } from '../../features/auth/models/auth.model';

/**
 * Servicio global para gestionar el contexto de la empresa seleccionada
 * Este servicio actúa como una capa de abstracción sobre AuthService
 * específicamente para el manejo del contexto empresarial
 */
@Injectable({
  providedIn: 'root'
})
export class EmpresaContextService {
  private authService = inject(AuthService);

  /**
   * Observable que emite la empresa actualmente seleccionada
   */
  readonly selectedEmpresa$ = this.authService.selectedEmpresa$;

  /**
   * Observable que emite el ID de la empresa seleccionada
   */
  readonly empresaId$ = this.authService.empresaId$;

  /**
   * Observable que emite true cuando hay una empresa seleccionada
   */
  readonly hasEmpresaSelected$ = this.authService.hasEmpresaSelected$;

  /**
   * Observable que emite solo cuando hay una empresa válida seleccionada
   * Útil para componentes que requieren una empresa para funcionar
   */
  readonly validEmpresaContext$ = this.selectedEmpresa$.pipe(
    filter(empresa => empresa !== null)
  );

  /**
   * Observable que emite el ID de empresa solo cuando es válido (no null)
   */
  readonly validEmpresaId$ = this.empresaId$.pipe(
    filter(id => id !== null)
  ) as Observable<number>;

  /**
   * Obtiene la empresa actualmente seleccionada (sincrono)
   */
  getSelectedEmpresa(): EmpresaInfo | null {
    return this.authService.getSelectedEmpresa();
  }

  /**
   * Obtiene el ID de la empresa actual (sincrono)
   */
  getCurrentEmpresaId(): number | null {
    return this.authService.getCurrentEmpresaId();
  }

  /**
   * Verifica si hay una empresa seleccionada (sincrono)
   */
  hasSelectedEmpresa(): boolean {
    return this.authService.hasSelectedEmpresa();
  }

  /**
   * Establece una nueva empresa seleccionada
   */
  setSelectedEmpresa(empresa: EmpresaInfo): void {
    this.authService.setSelectedEmpresa(empresa);
  }

  /**
   * Obtiene las empresas disponibles para el usuario actual
   */
  getAvailableEmpresas(): EmpresaInfo[] {
    return this.authService.getAvailableEmpresas();
  }

  /**
   * Verifica si el usuario actual tiene múltiples empresas disponibles
   */
  hasMultipleEmpresas(): boolean {
    return this.getAvailableEmpresas().length > 1;
  }

  /**
   * Obtiene información contextual para mostrar en la UI
   */
  getContextInfo(): { empresaName: string; empresaId: number } | null {
    const empresa = this.getSelectedEmpresa();
    if (!empresa) return null;

    return {
      empresaName: empresa.nombre,
      empresaId: empresa.id
    };
  }

  /**
   * Valida que existe un contexto empresarial válido
   * Útil para guards y validaciones
   */
  validateEmpresaContext(): boolean {
    return this.hasSelectedEmpresa() && this.getCurrentEmpresaId() !== null;
  }

  /**
   * Obtiene un observable que emite el contexto empresarial completo
   * cuando está disponible
   */
  getEmpresaContext$(): Observable<{empresa: EmpresaInfo, id: number}> {
    return this.selectedEmpresa$.pipe(
      filter(empresa => empresa !== null),
      map(empresa => ({ empresa: empresa!, id: empresa!.id }))
    );
  }
}
