/**
 * Servicio mejorado para gestión de equipos con filtrado local y paginación
 */
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, tap, catchError, debounceTime, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { FleetService } from './fleet.service';
import { CatalogosService } from './catalogos.service';
import { InspectionStatusService } from '../utils/inspection-status.service';
import { 
  EquipoResponse, 
  EquipoFilters, 
  FleetServiceOptions, 
  InspectionFilterType,
  EstadoEquipoResponse 
} from '../models';

export interface EquiposPaginatedResult {
  equipos: EquipoResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class EquiposEnhancedService {
  private readonly fleetService = inject(FleetService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly inspectionStatusService = inject(InspectionStatusService);

  // Cache de equipos por empresa
  private equiposCache = new Map<number, {
    equipos: EquipoResponse[];
    lastLoaded: number;
    loading: boolean;
  }>();

  // Estado reactivo
  private readonly _equiposFiltrados$ = new BehaviorSubject<EquipoResponse[]>([]);
  private readonly _filtrosActivos$ = new BehaviorSubject<EquipoFilters>({});
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

  // Configuración
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutos para equipos

  // Observables públicos
  public readonly equiposFiltrados$ = this._equiposFiltrados$.asObservable();
  public readonly filtrosActivos$ = this._filtrosActivos$.asObservable();
  public readonly loading$ = this._loading$.asObservable();
  public readonly error$ = this._error$.asObservable();

  /**
   * Carga equipos de una empresa (con cache)
   */
  loadEquiposByEmpresa(empresaId: number, forceReload = false, options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    const cached = this.equiposCache.get(empresaId);
    
    // Verificar cache válido
    if (!forceReload && cached && !cached.loading && this.isCacheValid(cached.lastLoaded)) {
      return of(cached.equipos);
    }

    // Si ya se está cargando, crear observable que espere
    if (cached?.loading) {
      return new Observable<EquipoResponse[]>(subscriber => {
        const checkLoading = () => {
          const currentCache = this.equiposCache.get(empresaId);
          if (currentCache && !currentCache.loading) {
            subscriber.next(currentCache.equipos);
            subscriber.complete();
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    // Marcar como cargando
    this.equiposCache.set(empresaId, {
      equipos: cached?.equipos || [],
      lastLoaded: cached?.lastLoaded || 0,
      loading: true
    });

    this._loading$.next(true);
    this._error$.next(null);

    return this.fleetService.getEquiposByEmpresa(empresaId, options).pipe(
      tap(equipos => {
        // Actualizar cache
        this.equiposCache.set(empresaId, {
          equipos,
          lastLoaded: Date.now(),
          loading: false
        });
        this._loading$.next(false);
      }),
      catchError(error => {
        // Marcar como no cargando en caso de error
        const currentCache = this.equiposCache.get(empresaId);
        if (currentCache) {
          this.equiposCache.set(empresaId, {
            ...currentCache,
            loading: false
          });
        }
        
        this._loading$.next(false);
        this._error$.next('Error al cargar equipos');
        console.error('Error loading equipos:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Aplica filtros localmente a los equipos
   */
  applyFilters(empresaId: number, filtros: EquipoFilters): Observable<EquipoResponse[]> {
    this._filtrosActivos$.next(filtros);

    return this.loadEquiposByEmpresa(empresaId).pipe(
      map(equipos => this.filterEquiposLocally(equipos, filtros)),
      tap(equiposFiltrados => this._equiposFiltrados$.next(equiposFiltrados))
    );
  }

  /**
   * Obtiene equipos paginados con filtros aplicados
   */
  getEquiposPaginated(
    empresaId: number, 
    filtros: EquipoFilters, 
    page: number = 0, 
    size: number = 10
  ): Observable<EquiposPaginatedResult> {
    return this.applyFilters(empresaId, filtros).pipe(
      map(equiposFiltrados => {
        const totalElements = equiposFiltrados.length;
        const totalPages = Math.ceil(totalElements / size);
        const startIndex = page * size;
        const endIndex = startIndex + size;
        const equipos = equiposFiltrados.slice(startIndex, endIndex);

        return {
          equipos,
          totalElements,
          totalPages,
          currentPage: page,
          pageSize: size
        };
      })
    );
  }

  /**
   * Filtrado local de equipos
   */
  private filterEquiposLocally(equipos: EquipoResponse[], filtros: EquipoFilters): EquipoResponse[] {
    let equiposFiltrados = [...equipos];

    // Filtro por texto de búsqueda (placa, equipo, negocio)
    if (filtros.placa?.trim()) {
      const searchTerm = filtros.placa.trim().toUpperCase();
      equiposFiltrados = equiposFiltrados.filter(equipo =>
        equipo.placa?.toUpperCase().includes(searchTerm) ||
        equipo.equipo?.toUpperCase().includes(searchTerm) ||
        equipo.negocio?.toUpperCase().includes(searchTerm)
      );
    }

    // Filtro por estado de equipo
    if (filtros.estadoId && filtros.estadoId > 0) {
      equiposFiltrados = equiposFiltrados.filter(equipo =>
        equipo.estadoEquipoResponse?.id === filtros.estadoId
      );
    }

    // Filtro por estado de inspección
    if (filtros.estadoInspeccion && filtros.estadoInspeccion !== 'todos') {
      equiposFiltrados = equiposFiltrados.filter(equipo =>
        this.matchesInspectionFilter(equipo, filtros.estadoInspeccion!)
      );
    }

    return equiposFiltrados;
  }
  /**
   * Verifica si un equipo coincide con el filtro de inspección
   */
  private matchesInspectionFilter(equipo: EquipoResponse, filtro: InspectionFilterType): boolean {
    const status = this.inspectionStatusService.calculateInspectionStatus(equipo.fechaInspeccion);

    switch (filtro) {
      case 'al-dia':
        return status.status === 'good';
      case 'proxima':
        return status.status === 'warning';
      case 'vencida':
        return status.status === 'critical';
      case 'requiere-atencion':
        return status.status === 'warning' || status.status === 'critical';
      case 'todos':
      default:
        return true;
    }
  }

  /**
   * Ordena equipos por campo especificado
   */
  sortEquipos(equipos: EquipoResponse[], field: string, direction: 'asc' | 'desc'): EquipoResponse[] {
    return [...equipos].sort((a, b) => {
      const aValue = this.getFieldValue(a, field);
      const bValue = this.getFieldValue(b, field);

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  /**
   * Obtiene valor de campo para ordenamiento
   */
  private getFieldValue(equipo: EquipoResponse, field: string): any {
    switch (field) {
      case 'placa':
        return equipo.placa?.toLowerCase() || '';
      case 'negocio':
        return equipo.negocio?.toLowerCase() || '';
      case 'equipo':
        return equipo.equipo?.toLowerCase() || '';
      case 'estado':
        return equipo.estadoEquipoResponse?.nombre.toLowerCase() || '';
      case 'fechaInspeccion':
        return equipo.fechaInspeccion || '';
      default:
        return '';
    }
  }

  /**
   * Fuerza la recarga de equipos de una empresa
   */
  refreshEquipos(empresaId: number, options?: FleetServiceOptions): Observable<EquipoResponse[]> {
    return this.loadEquiposByEmpresa(empresaId, true, options);
  }

  /**
   * Limpia el cache de una empresa específica
   */
  clearCacheForEmpresa(empresaId: number): void {
    this.equiposCache.delete(empresaId);
  }

  /**
   * Limpia todo el cache
   */
  clearAllCache(): void {
    this.equiposCache.clear();
    this._equiposFiltrados$.next([]);
    this._filtrosActivos$.next({});
    this._error$.next(null);
  }

  /**
   * Verifica si el cache es válido
   */
  private isCacheValid(lastLoaded: number): boolean {
    return Date.now() - lastLoaded < this.CACHE_TTL;
  }

  /**
   * Obtiene estadísticas de los equipos filtrados
   */
  getEquiposStats(equipos: EquipoResponse[]): Observable<{
    total: number;
    porEstado: Map<string, number>;
    porInspeccion: Map<string, number>;
  }> {
    return this.catalogosService.getEstadosEquipo().pipe(
      map(estados => {
        const porEstado = new Map<string, number>();
        const porInspeccion = new Map<string, number>();

        // Inicializar contadores
        estados.forEach(estado => porEstado.set(estado.nombre, 0));
        ['al-dia', 'proxima', 'vencida'].forEach(status => porInspeccion.set(status, 0));        // Contar equipos
        equipos.forEach(equipo => {
          // Por estado
          const estadoNombre = equipo.estadoEquipoResponse?.nombre || 'Sin estado';
          porEstado.set(estadoNombre, (porEstado.get(estadoNombre) || 0) + 1);

          // Por inspección
          const inspectionStatus = this.inspectionStatusService.calculateInspectionStatus(equipo.fechaInspeccion);
          let inspectionKey = 'al-dia';
          if (inspectionStatus.status === 'warning') inspectionKey = 'proxima';
          if (inspectionStatus.status === 'critical') inspectionKey = 'vencida';
          
          porInspeccion.set(inspectionKey, (porInspeccion.get(inspectionKey) || 0) + 1);
        });

        return {
          total: equipos.length,
          porEstado,
          porInspeccion
        };
      })
    );
  }
}
