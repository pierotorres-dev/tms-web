import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, forkJoin, of, combineLatest } from 'rxjs';

import { FleetService } from './fleet.service';
import { 
  ObservacionEquipoRequestDto, 
  ObservacionEquipoResponseDto,
  ObservacionFilters,
  EstadoObservacionDto,
  TipoObservacionNeumaticoDto
} from '../models/fleet.dto';
import { FleetServiceOptions } from '../models/fleet.model';

/**
 * Servicio especializado para operaciones con observaciones de equipos
 */
@Injectable({
  providedIn: 'root'
})
export class ObservacionesService {
  private readonly fleetService = inject(FleetService);

  // ==================== OPERACIONES DE BÚSQUEDA Y FILTRADO ====================

  /**
   * Obtiene observaciones con filtros avanzados
   */
  searchObservaciones(equipoId: number, filtros?: ObservacionFilters, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto[]> {
    return this.fleetService.getObservacionesByEquipo(equipoId, options).pipe(
      map(observaciones => filtros ? this.aplicarFiltrosLocales(observaciones, filtros) : observaciones)
    );
  }

  /**
   * Obtiene observaciones pendientes de un equipo
   */
  getObservacionesPendientes(equipoId: number, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto[]> {
    return this.fleetService.estadosObservacion$.pipe(
      switchMap(estados => {
        const estadoPendiente = estados.find(e => e.nombre.toUpperCase().includes('PENDIENTE'));
        if (estadoPendiente) {
          return this.searchObservaciones(equipoId, { estadoId: estadoPendiente.id }, options);
        }
        return this.fleetService.getObservacionesByEquipo(equipoId, options);
      })
    );
  }

  /**
   * Obtiene observaciones por tipo específico
   */
  getObservacionesByTipo(equipoId: number, tipoObservacionId: number, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto[]> {
    return this.searchObservaciones(equipoId, { tipoObservacionId }, options);
  }

  /**
   * Obtiene observaciones en un rango de fechas
   */
  getObservacionesByFechas(equipoId: number, fechaDesde: Date, fechaHasta: Date, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto[]> {
    return this.searchObservaciones(equipoId, { fechaDesde, fechaHasta }, options);
  }

  // ==================== OPERACIONES DE CREACIÓN Y ACTUALIZACIÓN ====================

  /**
   * Crea una nueva observación con validaciones adicionales
   */
  createObservacionWithValidation(observacionData: ObservacionEquipoRequestDto, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto | null> {
    return this.validateObservacionData(observacionData).pipe(
      switchMap(validation => {
        if (!validation.valid) {
          if (options?.showErrorNotification ?? true) {
            validation.errors.forEach(error => {
              this.fleetService['notificationService'].error(error);
            });
          }
          return of(null);
        }

        // Si no se especifica fecha, usar la actual
        if (!observacionData.fecha) {
          observacionData.fecha = new Date();
        }

        return this.fleetService.createObservacion(observacionData, options);
      })
    );
  }

  /**
   * Actualiza una observación existente con validaciones
   */
  updateObservacionWithValidation(id: number, observacionData: ObservacionEquipoRequestDto, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto | null> {
    return this.validateObservacionData(observacionData).pipe(
      switchMap(validation => {
        if (!validation.valid) {
          if (options?.showErrorNotification ?? true) {
            validation.errors.forEach(error => {
              this.fleetService['notificationService'].error(error);
            });
          }
          return of(null);
        }

        return this.fleetService.updateObservacion(id, observacionData, options);
      })
    );
  }

  /**
   * Resuelve una observación marcándola como resuelta
   */
  resolverObservacion(id: number, comentarioResolucion: string, usuarioResolucion: string, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto | null> {
    return this.fleetService.estadosObservacion$.pipe(
      switchMap(estados => {
        const estadoResuelto = estados.find(e => e.nombre.toUpperCase().includes('RESUELTO') || e.nombre.toUpperCase().includes('CERRADO'));
        
        if (!estadoResuelto) {
          if (options?.showErrorNotification ?? true) {
            this.fleetService['notificationService'].error('No se encontró el estado "Resuelto" en el catálogo');
          }
          return of(null);
        }

        // Primero obtenemos la observación actual para mantener sus datos
        return this.getObservacionById(id).pipe(
          switchMap(observacionActual => {
            if (!observacionActual) {
              return of(null);
            }

            const observacionActualizada: ObservacionEquipoRequestDto = {
              equipoId: observacionActual.equipoId,
              fecha: observacionActual.fecha,
              tipoObservacionId: observacionActual.tipoObservacionNeumaticoResponse.id,
              descripcion: observacionActual.descripcion,
              estadoId: estadoResuelto.id,
              fechaResolucion: new Date(),
              comentarioResolucion,
              usuarioResolucion,
              usuarioId: observacionActual.usuarioId
            };

            return this.fleetService.updateObservacion(id, observacionActualizada, options);
          })
        );
      })
    );
  }

  // ==================== OPERACIONES EN LOTE ====================

  /**
   * Resuelve múltiples observaciones de un equipo
   */
  resolverObservacionesLote(equipoId: number, observacionesIds: number[], comentarioResolucion: string, usuarioResolucion: string, options?: FleetServiceOptions): Observable<number> {
    const resoluciones = observacionesIds.map(id => 
      this.resolverObservacion(id, comentarioResolucion, usuarioResolucion, { 
        ...options, 
        showSuccessNotification: false 
      })
    );

    return forkJoin(resoluciones).pipe(
      map(results => results.filter(result => result !== null).length),
      switchMap(successCount => {
        if (options?.showSuccessNotification ?? true) {
          this.fleetService['notificationService'].success(
            `${successCount} observaciones resueltas exitosamente`
          );
        }
        return of(successCount);
      })
    );
  }

  /**
   * Actualiza el estado de múltiples observaciones
   */
  updateEstadoObservacionesLote(observacionesIds: number[], estadoId: number, options?: FleetServiceOptions): Observable<number> {
    const updates = observacionesIds.map(id => 
      this.updateEstadoObservacion(id, estadoId, { 
        ...options, 
        showSuccessNotification: false 
      })
    );

    return forkJoin(updates).pipe(
      map(results => results.filter(result => result !== null).length),
      switchMap(successCount => {
        if (options?.showSuccessNotification ?? true) {
          this.fleetService['notificationService'].success(
            `${successCount} observaciones actualizadas exitosamente`
          );
        }
        return of(successCount);
      })
    );
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  /**
   * Obtiene una observación por ID
   */
  private getObservacionById(id: number): Observable<ObservacionEquipoResponseDto | null> {
    // Como no tenemos endpoint directo para obtener por ID, buscamos en las observaciones cargadas
    return this.fleetService.observacionesEquipo$.pipe(
      map(observaciones => observaciones.find(obs => obs.id === id) || null)
    );
  }

  /**
   * Actualiza solo el estado de una observación
   */
  private updateEstadoObservacion(id: number, estadoId: number, options?: FleetServiceOptions): Observable<ObservacionEquipoResponseDto | null> {
    return this.getObservacionById(id).pipe(
      switchMap(observacionActual => {
        if (!observacionActual) {
          return of(null);
        }

        const observacionActualizada: ObservacionEquipoRequestDto = {
          equipoId: observacionActual.equipoId,
          fecha: observacionActual.fecha,
          tipoObservacionId: observacionActual.tipoObservacionNeumaticoResponse.id,
          descripcion: observacionActual.descripcion,
          estadoId: estadoId,
          fechaResolucion: observacionActual.fechaResolucion,
          comentarioResolucion: observacionActual.comentarioResolucion,
          usuarioResolucion: observacionActual.usuarioResolucion,
          usuarioId: observacionActual.usuarioId
        };

        return this.fleetService.updateObservacion(id, observacionActualizada, options);
      })
    );
  }

  /**
   * Valida los datos de una observación
   */
  private validateObservacionData(observacionData: ObservacionEquipoRequestDto): Observable<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validaciones básicas
    if (!observacionData.equipoId) {
      errors.push('El equipo es requerido');
    }

    if (!observacionData.tipoObservacionId) {
      errors.push('El tipo de observación es requerido');
    }

    if (!observacionData.estadoId) {
      errors.push('El estado es requerido');
    }

    if (observacionData.descripcion && observacionData.descripcion.length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres');
    }

    if (observacionData.comentarioResolucion && observacionData.comentarioResolucion.length > 500) {
      errors.push('El comentario de resolución no puede exceder 500 caracteres');
    }

    return of({ valid: errors.length === 0, errors });
  }

  /**
   * Aplica filtros localmente a las observaciones
   */
  private aplicarFiltrosLocales(observaciones: ObservacionEquipoResponseDto[], filtros: ObservacionFilters): ObservacionEquipoResponseDto[] {
    return observaciones.filter(obs => {
      // Filtro por estado
      if (filtros.estadoId && obs.estadoObservacionResponse.id !== filtros.estadoId) {
        return false;
      }

      // Filtro por tipo de observación
      if (filtros.tipoObservacionId && obs.tipoObservacionNeumaticoResponse.id !== filtros.tipoObservacionId) {
        return false;
      }

      // Filtro por rango de fechas
      if (filtros.fechaDesde || filtros.fechaHasta) {
        const fechaObs = new Date(obs.fecha);
        
        if (filtros.fechaDesde && fechaObs < filtros.fechaDesde) {
          return false;
        }
        
        if (filtros.fechaHasta && fechaObs > filtros.fechaHasta) {
          return false;
        }
      }

      // Filtro por usuario
      if (filtros.usuarioId && obs.usuarioId !== filtros.usuarioId) {
        return false;
      }

      return true;
    });
  }
}