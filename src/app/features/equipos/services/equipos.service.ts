import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, forkJoin, of, BehaviorSubject } from 'rxjs';

import { FleetService } from './fleet.service';
import { 
  EquipoResponse, 
  EquipoRequest, 
  EquipoFilters
} from '../models/fleet.dto';
import { FleetServiceOptions } from '../models/fleet.model';
import { InspectionStatusService } from '../utils/inspection-status.service';

/**
 * Servicio especializado para operaciones avanzadas con equipos
 * Extiende la funcionalidad básica del FleetService
 */
@Injectable({
  providedIn: 'root'
})
export class EquiposService {
  private readonly fleetService = inject(FleetService);
  private readonly inspectionStatusService = inject(InspectionStatusService);

  // Estado local para filtros
  private readonly _filtrosActivos$ = new BehaviorSubject<EquipoFilters>({});
  
  /**
   * Filtros actualmente aplicados
   */
  public readonly filtrosActivos$ = this._filtrosActivos$.asObservable();

  // ==================== OPERACIONES DE BÚSQUEDA Y FILTRADO ====================

  /**
   * Busca equipos con filtros avanzados
   */
  searchEquipos(filtros: EquipoFilters, options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    this._filtrosActivos$.next(filtros);

    // Si solo se especifica empresa, usar el método base
    if (filtros.empresaId && Object.keys(filtros).length === 1) {
      return this.fleetService.getEquiposByEmpresa(filtros.empresaId, options);
    }

    // Para filtros más complejos, obtenemos todos y filtramos localmente
    if (!filtros.empresaId) {
      throw new Error('EmpresaId es requerido para búsquedas de equipos');
    }

    return this.fleetService.getEquiposByEmpresa(filtros.empresaId, options).pipe(
      map(equipos => this.aplicarFiltrosLocales(equipos, filtros))
    );
  }

  /**
   * Obtiene equipos por estado específico
   */
  getEquiposByEstado(empresaId: number, estadoId: number, options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    return this.searchEquipos({ empresaId, estadoId }, options);
  }

  /**
   * Obtiene equipos activos de una empresa
   */
  getEquiposActivos(empresaId: number, options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    return this.fleetService.estadosEquipo$.pipe(
      switchMap(estados => {
        const estadoActivo = estados.find(e => e.nombre.toUpperCase() === 'ACTIVO');
        if (estadoActivo) {
          return this.getEquiposByEstado(empresaId, estadoActivo.id, options);
        }
        return this.fleetService.getEquiposByEmpresa(empresaId, options);
      })
    );
  }

  /**
   * Busca equipos por placa (búsqueda parcial)
   */
  searchByPlaca(empresaId: number, placa: string, options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    return this.searchEquipos({ empresaId, placa: placa.toUpperCase() }, options);
  }

  // ==================== OPERACIONES DE VALIDACIÓN ====================

  /**
   * Valida si una placa ya existe en la empresa
   */
  validatePlacaExists(empresaId: number, placa: string, excludeId?: number): Observable<boolean> {
    return this.fleetService.getEquiposByEmpresa(empresaId, { showErrorNotification: false }).pipe(
      map(equipos => {
        const equipoExistente = equipos.find(e => 
          e.placa.toUpperCase() === placa.toUpperCase() && 
          (!excludeId || e.id !== excludeId)
        );
        return !!equipoExistente;
      })
    );
  }

  /**
   * Valida los datos de un equipo antes de guardar
   */
  validateEquipoData(equipoData: EquipoRequest): Observable<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validaciones básicas
    if (!equipoData.placa || equipoData.placa.trim().length === 0) {
      errors.push('La placa es requerida');
    }

    if (!equipoData.empresaId) {
      errors.push('La empresa es requerida');
    }

    if (!equipoData.estadoId) {
      errors.push('El estado es requerido');
    }

    if (equipoData.kilometraje && equipoData.kilometraje < 0) {
      errors.push('El kilometraje no puede ser negativo');
    }

    // Validación de placa existente (solo si hay empresa)
    if (equipoData.empresaId && equipoData.placa && errors.length === 0) {
      return this.validatePlacaExists(equipoData.empresaId, equipoData.placa).pipe(
        map(exists => {
          if (exists) {
            errors.push('Ya existe un equipo con esta placa');
          }
          return { valid: errors.length === 0, errors };
        })
      );
    }

    return of({ valid: errors.length === 0, errors });
  }

  // ==================== OPERACIONES EN LOTE ====================

  /**
   * Actualiza el estado de múltiples equipos
   */
  updateEstadoMultiple(equiposIds: number[], estadoId: number, options?: FleetServiceOptions): Observable<number> {
    const updates = equiposIds.map(id => 
      this.fleetService.updateEstadoEquipo(id, estadoId, { 
        ...options, 
        showSuccessNotification: false 
      })
    );

    return forkJoin(updates).pipe(
      map(results => results.filter(result => result !== null).length),
      switchMap(successCount => {
        if (options?.showSuccessNotification ?? true) {
          this.fleetService['notificationService'].success(
            `${successCount} equipos actualizados exitosamente`
          );
        }
        return of(successCount);
      })
    );
  }

  /**
   * Crea múltiples equipos en lote
   */
  createEquiposLote(equiposData: EquipoRequest[], options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    const creates = equiposData.map(equipo => 
      this.fleetService.createEquipo(equipo, { 
        ...options, 
        showSuccessNotification: false 
      })
    );

    return forkJoin(creates).pipe(
      map(results => results.filter(result => result !== null) as EquipoResponse[]),
      switchMap(successResults => {
        if (options?.showSuccessNotification ?? true) {
          this.fleetService['notificationService'].success(
            `${successResults.length} equipos creados exitosamente`
          );
        }
        return of(successResults);
      })
    );  }

  // ==================== MÉTODOS PRIVADOS ====================
  /**
   * Aplica filtros localmente a una lista de equipos
   */  private aplicarFiltrosLocales(equipos: EquipoResponse[], filtros: EquipoFilters): EquipoResponse[] {
    // Debug log para desarrollo (se puede eliminar en producción)
    if (console && typeof console.log === 'function') {
      console.log('🔍 Aplicando filtros locales:', {
        totalEquipos: equipos.length,
        filtros: filtros,
        tipoEstadoId: typeof filtros.estadoId,
        valorEstadoId: filtros.estadoId
      });
    }

    const equiposFiltrados = equipos.filter(equipo => {
      // Filtro por estado - Asegurar comparación consistente de tipos
      if (filtros.estadoId !== undefined && filtros.estadoId !== null && filtros.estadoId > 0) {
        const equipoEstadoId = equipo.estadoEquipoResponse?.id;
        const filtroEstadoId = Number(filtros.estadoId); // Asegurar que sea número
        
        // Debug específico para filtro de estado
        if (console && typeof console.log === 'function') {
          console.log('🏷️ Comparando estado:', {
            equipoId: equipo.id,
            equipoPlaca: equipo.placa,
            equipoEstadoId: equipoEstadoId,
            tipoEquipoEstadoId: typeof equipoEstadoId,
            filtroEstadoId: filtroEstadoId,
            tipoFiltroEstadoId: typeof filtroEstadoId,
            coincide: equipoEstadoId === filtroEstadoId
          });
        }
        
        if (!equipoEstadoId || equipoEstadoId !== filtroEstadoId) {
          return false;
        }
      }

      // Filtro de búsqueda general (placa, equipo, negocio)
      if (filtros.placa && filtros.placa.trim().length > 0) {
        const searchTerm = filtros.placa.trim().toUpperCase();
        const placaMatch = equipo.placa?.toUpperCase().includes(searchTerm) || false;
        const equipoMatch = equipo.equipo?.toUpperCase().includes(searchTerm) || false;
        const negocioMatch = equipo.negocio?.toUpperCase().includes(searchTerm) || false;
        
        if (!placaMatch && !equipoMatch && !negocioMatch) {
          return false;
        }
      }

      // Filtro específico por tipo de equipo
      if (filtros.equipo && filtros.equipo.trim().length > 0) {
        if (!equipo.equipo || !equipo.equipo.toUpperCase().includes(filtros.equipo.trim().toUpperCase())) {
          return false;
        }
      }      // Filtro específico por negocio
      if (filtros.negocio && filtros.negocio.trim().length > 0) {
        if (!equipo.negocio || !equipo.negocio.toUpperCase().includes(filtros.negocio.trim().toUpperCase())) {
          return false;
        }
      }

      // Filtro por estado de inspección
      if (filtros.estadoInspeccion && filtros.estadoInspeccion !== 'todos') {
        const inspectionResult = this.inspectionStatusService.calculateInspectionStatus(equipo.fechaInspeccion);
        
        switch (filtros.estadoInspeccion) {
          case 'al-dia':
            // Verde: menos de 20 días
            if (inspectionResult.status !== 'good') {
              return false;
            }
            break;
            
          case 'proxima':
            // Amarillo/Naranja: entre 20-30 días
            if (inspectionResult.status !== 'warning') {
              return false;
            }
            break;
            
          case 'vencida':
            // Rojo: más de 30 días o null/blank
            if (inspectionResult.status !== 'critical') {
              return false;
            }
            break;
            
          case 'requiere-atencion':
            // Combina "Próxima" y "Vencida": 20+ días o null/blank
            if (inspectionResult.status === 'good') {
              return false;
            }
            break;
        }
      }

      return true;
    });
    
    // Debug final
    if (console && typeof console.log === 'function') {
      console.log('✅ Filtros aplicados:', {
        equiposOriginales: equipos.length,
        equiposFiltrados: equiposFiltrados.length,
        equiposEliminados: equipos.length - equiposFiltrados.length
      });
    }
    
    return equiposFiltrados;
  }

  /**
   * Limpia los filtros activos
   */
  clearFiltros(): void {
    this._filtrosActivos$.next({});
  }

  /**
   * Actualiza los filtros activos
   */
  updateFiltros(filtros: Partial<EquipoFilters>): void {
    const filtrosActuales = this._filtrosActivos$.value;
    this._filtrosActivos$.next({ ...filtrosActuales, ...filtros });
  }
}