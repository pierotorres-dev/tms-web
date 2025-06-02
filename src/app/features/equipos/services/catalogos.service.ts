/**
 * Servicio para gestión centralizada de catálogos
 * Mantiene catálogos en cache y los comparte entre componentes
 */
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { FleetService } from './fleet.service';
import { EstadoEquipoResponse, EstadoObservacionResponse, TipoObservacionNeumaticoResponse, FleetServiceOptions } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CatalogosService {
  private readonly fleetService = inject(FleetService);

  // Estados de carga
  private readonly _catalogosLoaded$ = new BehaviorSubject<boolean>(false);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);

  // Cache de catálogos
  private catalogosCache: {
    estadosEquipo: EstadoEquipoResponse[];
    estadosObservacion: EstadoObservacionResponse[];
    tiposObservacionNeumatico: TipoObservacionNeumaticoResponse[];
    lastLoaded: number | null;
  } = {
    estadosEquipo: [],
    estadosObservacion: [],
    tiposObservacionNeumatico: [],
    lastLoaded: null
  };

  // Observable para saber si los catálogos están cargados
  public readonly catalogosLoaded$ = this._catalogosLoaded$.asObservable();
  public readonly loading$ = this._loading$.asObservable();

  // TTL para cache (5 minutos)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  /**
   * Inicializa y carga catálogos si es necesario
   */
  initializeCatalogos(options?: FleetServiceOptions): Observable<boolean> {
    // Verificar si ya están cargados y son recientes
    if (this.isCacheValid()) {
      this._catalogosLoaded$.next(true);
      return of(true);
    }

    // Si ya se están cargando, esperar a que terminen
    if (this._loading$.value) {
      return this.catalogosLoaded$.pipe(
        map(() => true)
      );
    }

    return this.loadCatalogos(options);
  }

  /**
   * Carga todos los catálogos
   */
  private loadCatalogos(options?: FleetServiceOptions): Observable<boolean> {
    this._loading$.next(true);

    return combineLatest([
      this.fleetService.loadEstadosEquipo(options),
      this.fleetService.loadEstadosObservacion(options),
      this.fleetService.loadTiposObservacionNeumatico(options)
    ]).pipe(
      tap(([estadosEquipo, estadosObservacion, tiposObservacionNeumatico]) => {
        // Actualizar cache
        this.catalogosCache = {
          estadosEquipo,
          estadosObservacion,
          tiposObservacionNeumatico,
          lastLoaded: Date.now()
        };

        this._catalogosLoaded$.next(true);
        this._loading$.next(false);
      }),
      map(() => true),
      catchError(error => {
        this._loading$.next(false);
        this._catalogosLoaded$.next(false);
        console.error('Error loading catalogos:', error);
        return of(false);
      }),
      shareReplay(1)
    );
  }

  /**
   * Verifica si el cache es válido
   */
  private isCacheValid(): boolean {
    return this.catalogosCache.lastLoaded !== null &&
           (Date.now() - this.catalogosCache.lastLoaded) < this.CACHE_TTL &&
           this.catalogosCache.estadosEquipo.length > 0;
  }

  /**
   * Obtiene estados de equipo (desde cache o FleetService)
   */
  getEstadosEquipo(): Observable<EstadoEquipoResponse[]> {
    if (this.isCacheValid()) {
      return of(this.catalogosCache.estadosEquipo);
    }
    return this.fleetService.estadosEquipo$;
  }

  /**
   * Obtiene estados de observación (desde cache o FleetService)
   */
  getEstadosObservacion(): Observable<EstadoObservacionResponse[]> {
    if (this.isCacheValid()) {
      return of(this.catalogosCache.estadosObservacion);
    }
    return this.fleetService.estadosObservacion$;
  }

  /**
   * Obtiene tipos de observación de neumático (desde cache o FleetService)
   */
  getTiposObservacionNeumatico(): Observable<TipoObservacionNeumaticoResponse[]> {
    if (this.isCacheValid()) {
      return of(this.catalogosCache.tiposObservacionNeumatico);
    }
    return this.fleetService.tiposObservacionNeumatico$;
  }

  /**
   * Fuerza la recarga de catálogos
   */
  reloadCatalogos(options?: FleetServiceOptions): Observable<boolean> {
    this.catalogosCache.lastLoaded = null;
    return this.loadCatalogos(options);
  }

  /**
   * Busca un estado de equipo por ID
   */
  getEstadoEquipoById(id: number): EstadoEquipoResponse | undefined {
    return this.catalogosCache.estadosEquipo.find(estado => estado.id === id);
  }

  /**
   * Busca un estado de equipo por nombre
   */
  getEstadoEquipoByNombre(nombre: string): EstadoEquipoResponse | undefined {
    return this.catalogosCache.estadosEquipo.find(estado => 
      estado.nombre.toUpperCase() === nombre.toUpperCase()
    );
  }

  /**
   * Limpia el cache
   */
  clearCache(): void {
    this.catalogosCache = {
      estadosEquipo: [],
      estadosObservacion: [],
      tiposObservacionNeumatico: [],
      lastLoaded: null
    };
    this._catalogosLoaded$.next(false);
  }
}
