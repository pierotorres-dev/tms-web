import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, catchError, of, switchMap, combineLatest } from 'rxjs';

import { HttpService } from '../../../core/services/http.service';
import { NotificationService } from '../../../core/services/notification.service';

import {
  EquipoRequest,
  EquipoResponse,
  ObservacionEquipoRequest,
  ObservacionEquipoResponse,
  TipoObservacionNeumaticoResponse,
  EstadoObservacionResponse,
  EstadoEquipoResponse
} from '../models/fleet.dto';

import { FleetMapper, FleetServiceOptions } from '../models/fleet.model';
import { Equipo } from '../models/equipo.model';
import { FLEET_API_ENDPOINTS, FLEET_MESSAGES, FLEET_PAGINATION_CONFIG, FLEET_CACHE_CONFIG } from '../constants/equipos.constants';

/**
 * Servicio para gestionar operaciones del Fleet Service API
 * Incluye gestión de equipos, observaciones y catálogos
 */
@Injectable({
  providedIn: 'root'
})
export class FleetService {
  private readonly httpService = inject(HttpService);
  private readonly notificationService = inject(NotificationService);

  // ==================== ESTADO REACTIVO ====================
  
  private readonly _equipos$ = new BehaviorSubject<EquipoResponse[]>([]);
  private readonly _equipoSeleccionado$ = new BehaviorSubject<EquipoResponse | null>(null);
  private readonly _observacionesEquipo$ = new BehaviorSubject<ObservacionEquipoResponse[]>([]);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);

  // Cache para catálogos
  private readonly _estadosEquipo$ = new BehaviorSubject<EstadoEquipoResponse[]>([]);
  private readonly _estadosObservacion$ = new BehaviorSubject<EstadoObservacionResponse[]>([]);
  private readonly _tiposObservacionNeumatico$ = new BehaviorSubject<TipoObservacionNeumaticoResponse[]>([]);

  // ==================== OBSERVABLES PÚBLICOS ====================
  
  /**
   * Lista de equipos actual
   */
  public readonly equipos$ = this._equipos$.asObservable();

  /**
   * Equipo seleccionado actualmente
   */
  public readonly equipoSeleccionado$ = this._equipoSeleccionado$.asObservable();

  /**
   * Observaciones del equipo seleccionado
   */
  public readonly observacionesEquipo$ = this._observacionesEquipo$.asObservable();

  /**
   * Estado de carga global del servicio
   */
  public readonly loading$ = this._loading$.asObservable();

  /**
   * Estados de equipo (catálogo)
   */
  public readonly estadosEquipo$ = this._estadosEquipo$.asObservable();

  /**
   * Estados de observación (catálogo)
   */
  public readonly estadosObservacion$ = this._estadosObservacion$.asObservable();

  /**
   * Tipos de observación de neumático (catálogo)
   */
  public readonly tiposObservacionNeumatico$ = this._tiposObservacionNeumatico$.asObservable();

  // ==================== GESTIÓN DE CATÁLOGOS ====================

  /**
   * Carga todos los catálogos necesarios
   */
  loadCatalogos(options?: FleetServiceOptions): Observable<boolean> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.CARGANDO_CATALOGOS);

    return combineLatest([
      this.loadEstadosEquipo(options),
      this.loadEstadosObservacion(options),
      this.loadTiposObservacionNeumatico(options)
    ]).pipe(
      map(() => true),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(false);
      })
    );
  }

  /**
   * Carga estados de equipo
   */
  loadEstadosEquipo(options?: FleetServiceOptions): Observable<EstadoEquipoResponse[]> {
    const url = FLEET_API_ENDPOINTS.CATALOGOS.ESTADO_EQUIPO;
    
    return this.httpService.get<EstadoEquipoResponse[]>(url, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(estados => this._estadosEquipo$.next(estados)),
      catchError(error => {
        this.handleError(error, options);
        return of([]);
      })
    );
  }

  /**
   * Carga estados de observación
   */
  loadEstadosObservacion(options?: FleetServiceOptions): Observable<EstadoObservacionResponse[]> {
    const url = FLEET_API_ENDPOINTS.CATALOGOS.ESTADO_OBSERVACION;
    
    return this.httpService.get<EstadoObservacionResponse[]>(url, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(estados => this._estadosObservacion$.next(estados)),
      catchError(error => {
        this.handleError(error, options);
        return of([]);
      })
    );
  }

  /**
   * Carga tipos de observación de neumático
   */
  loadTiposObservacionNeumatico(options?: FleetServiceOptions): Observable<TipoObservacionNeumaticoResponse[]> {
    const url = FLEET_API_ENDPOINTS.CATALOGOS.TIPO_OBSERVACION_NEUMATICO;
    
    return this.httpService.get<TipoObservacionNeumaticoResponse[]>(url, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(tipos => this._tiposObservacionNeumatico$.next(tipos)),
      catchError(error => {
        this.handleError(error, options);
        return of([]);
      })
    );
  }

  // ==================== GESTIÓN DE EQUIPOS ====================

  /**
   * Obtiene todos los equipos por empresa
   */
  getEquiposByEmpresa(empresaId: number, options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.CARGANDO_EQUIPOS);
    
    const url = FLEET_API_ENDPOINTS.EQUIPOS.BY_EMPRESA(empresaId);
    
    return this.httpService.get<EquipoResponse[]>(url, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(equipos => {
        this._equipos$.next(equipos);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un equipo por ID
   */
  getEquipoById(id: number, options?: FleetServiceOptions): Observable<EquipoResponse | null> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.CARGANDO_EQUIPO);
    
    const url = FLEET_API_ENDPOINTS.EQUIPOS.BY_ID(id);
    
    return this.httpService.get<EquipoResponse>(url, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(equipo => {
        this._equipoSeleccionado$.next(equipo);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(null);
      })
    );
  }

  /**
   * Crea un nuevo equipo
   */
  createEquipo(equipoData: EquipoRequest, options?: FleetServiceOptions): Observable<EquipoResponse | null> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.GUARDANDO_EQUIPO);
    
    const url = FLEET_API_ENDPOINTS.EQUIPOS.BASE;
    
    return this.httpService.post<EquipoResponse>(url, equipoData, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(equipo => {
        // Actualizar lista de equipos
        const equiposActuales = this._equipos$.value;
        this._equipos$.next([...equiposActuales, equipo]);
        
        this.setLoading(false);
        
        if (options?.showSuccessNotification ?? true) {
          this.notificationService.success(FLEET_MESSAGES.SUCCESS.EQUIPO_CREADO);
        }
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(null);
      })
    );
  }

  /**
   * Actualiza un equipo existente
   */
  updateEquipo(id: number, equipoData: EquipoRequest, options?: FleetServiceOptions): Observable<EquipoResponse | null> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.GUARDANDO_EQUIPO);
    
    const url = FLEET_API_ENDPOINTS.EQUIPOS.BY_ID(id);
    
    return this.httpService.put<EquipoResponse>(url, equipoData, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(equipoActualizado => {
        // Actualizar lista de equipos
        const equiposActuales = this._equipos$.value;
        const index = equiposActuales.findIndex(e => e.id === id);
        if (index !== -1) {
          equiposActuales[index] = equipoActualizado;
          this._equipos$.next([...equiposActuales]);
        }
        
        // Actualizar equipo seleccionado si es el mismo
        const equipoSeleccionado = this._equipoSeleccionado$.value;
        if (equipoSeleccionado && equipoSeleccionado.id === id) {
          this._equipoSeleccionado$.next(equipoActualizado);
        }
        
        this.setLoading(false);
        
        if (options?.showSuccessNotification ?? true) {
          this.notificationService.success(FLEET_MESSAGES.SUCCESS.EQUIPO_ACTUALIZADO);
        }
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(null);
      })
    );
  }
  /**
   * Actualiza el estado de un equipo
   */
  updateEstadoEquipo(id: number, estadoId: number, options?: FleetServiceOptions): Observable<EquipoResponse | null> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.ACTUALIZANDO_ESTADO);
    
    const url = FLEET_API_ENDPOINTS.EQUIPOS.UPDATE_ESTADO(id, estadoId);
    
    return this.httpService.patch<EquipoResponse>(url, {}, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(equipoActualizado => {
        if (equipoActualizado) {
          // Actualizar lista de equipos
          const equiposActuales = this._equipos$.value;
          const index = equiposActuales.findIndex(e => e.id === id);
          if (index !== -1) {
            equiposActuales[index] = equipoActualizado;
            this._equipos$.next([...equiposActuales]);
          }
          
          // Actualizar equipo seleccionado si es el mismo
          const equipoSeleccionado = this._equipoSeleccionado$.value;
          if (equipoSeleccionado && equipoSeleccionado.id === id) {
            this._equipoSeleccionado$.next(equipoActualizado);
          }
        }
        
        this.setLoading(false);
        
        if (options?.showSuccessNotification ?? true) {
          this.notificationService.success(FLEET_MESSAGES.SUCCESS.ESTADO_EQUIPO_ACTUALIZADO);
        }
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(null);
      })
    );
  }

  // ==================== GESTIÓN DE OBSERVACIONES ====================

  /**
   * Obtiene todas las observaciones de un equipo
   */
  getObservacionesByEquipo(equipoId: number, options?: FleetServiceOptions): Observable<ObservacionEquipoResponse[]> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.CARGANDO_OBSERVACIONES);
    
    const url = FLEET_API_ENDPOINTS.OBSERVACIONES.BY_EQUIPO(equipoId);
    
    return this.httpService.get<ObservacionEquipoResponse[]>(url, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(observaciones => {
        this._observacionesEquipo$.next(observaciones);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of([]);
      })
    );
  }

  /**
   * Crea una nueva observación
   */
  createObservacion(observacionData: ObservacionEquipoRequest, options?: FleetServiceOptions): Observable<ObservacionEquipoResponse | null> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.GUARDANDO_OBSERVACION);
    
    const url = FLEET_API_ENDPOINTS.OBSERVACIONES.BASE;
    
    return this.httpService.post<ObservacionEquipoResponse>(url, observacionData, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(observacion => {
        // Actualizar lista de observaciones si pertenece al equipo actual
        const observacionesActuales = this._observacionesEquipo$.value;
        if (observacionesActuales.length === 0 || observacionesActuales[0]?.equipoId === observacion.equipoId) {
          this._observacionesEquipo$.next([...observacionesActuales, observacion]);
        }
        
        this.setLoading(false);
        
        if (options?.showSuccessNotification ?? true) {
          this.notificationService.success(FLEET_MESSAGES.SUCCESS.OBSERVACION_CREADA);
        }
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(null);
      })
    );
  }

  /**
   * Actualiza una observación existente
   */
  updateObservacion(id: number, observacionData: ObservacionEquipoRequest, options?: FleetServiceOptions): Observable<ObservacionEquipoResponse | null> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.GUARDANDO_OBSERVACION);
    
    const url = FLEET_API_ENDPOINTS.OBSERVACIONES.BY_ID(id);
    
    return this.httpService.put<ObservacionEquipoResponse>(url, observacionData, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(observacionActualizada => {
        // Actualizar lista de observaciones
        const observacionesActuales = this._observacionesEquipo$.value;
        const index = observacionesActuales.findIndex(o => o.id === id);
        if (index !== -1) {
          observacionesActuales[index] = observacionActualizada;
          this._observacionesEquipo$.next([...observacionesActuales]);
        }
        
        this.setLoading(false);
        
        if (options?.showSuccessNotification ?? true) {
          this.notificationService.success(FLEET_MESSAGES.SUCCESS.OBSERVACION_ACTUALIZADA);
        }
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(null);
      })
    );
  }
  /**
   * Actualiza el estado de todas las observaciones de un equipo
   */
  updateEstadoObservacionesByEquipo(equipoId: number, estadoId: number, options?: FleetServiceOptions): Observable<number> {
    this.setLoading(true, FLEET_MESSAGES.LOADING.ACTUALIZANDO_ESTADO);
    
    const url = FLEET_API_ENDPOINTS.OBSERVACIONES.UPDATE_ESTADO_BY_EQUIPO(equipoId, estadoId);
    
    return this.httpService.patch<number>(url, {}, {
      showErrorNotification: options?.showErrorNotification ?? true
    }).pipe(
      tap(cantidadActualizados => {
        // Recargar observaciones del equipo
        this.getObservacionesByEquipo(equipoId, { showErrorNotification: false }).subscribe();
        
        this.setLoading(false);
        
        if (options?.showSuccessNotification ?? true) {
          this.notificationService.success(FLEET_MESSAGES.SUCCESS.OBSERVACIONES_ESTADO_ACTUALIZADO);
        }
      }),
      catchError(error => {
        this.setLoading(false);
        this.handleError(error, options);
        return of(0);
      })
    );
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  /**
   * Selecciona un equipo y carga sus observaciones
   */
  selectEquipo(equipo: EquipoResponse, loadObservaciones: boolean = true): void {
    this._equipoSeleccionado$.next(equipo);
    
    if (loadObservaciones) {
      this.getObservacionesByEquipo(equipo.id, { showErrorNotification: false }).subscribe();
    }
  }

  /**
   * Limpia el equipo seleccionado
   */
  clearEquipoSeleccionado(): void {
    this._equipoSeleccionado$.next(null);
    this._observacionesEquipo$.next([]);
  }

  /**
   * Obtiene el estado actual de un catálogo
   */
  getEstadoEquipoById(id: number): EstadoEquipoResponse | undefined {
    return this._estadosEquipo$.value.find(estado => estado.id === id);
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Gestiona el estado de carga
   */
  private setLoading(loading: boolean, message?: string): void {
    this._loading$.next(loading);
    
    if (loading && message) {
      // Aquí se podría mostrar un spinner global con el mensaje
      console.log(message);
    }
  }

  /**
   * Maneja errores de manera consistente
   */
  private handleError(error: any, options?: FleetServiceOptions): void {
    console.error('Fleet Service Error:', error);
    
    if (options?.showErrorNotification ?? true) {
      // El interceptor HTTP ya maneja las notificaciones de error
      // pero podemos añadir lógica adicional aquí si es necesario
    }
  }
}
