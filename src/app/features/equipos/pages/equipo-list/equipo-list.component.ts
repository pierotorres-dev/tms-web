import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, combineLatest, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, filter, catchError, switchMap, tap, map } from 'rxjs/operators';

// Importar servicios y modelos
import { FleetService, EquiposService, CatalogosService, EquiposEnhancedService } from '../../services';
import { EquipoResponse, EstadoEquipoResponse, EquipoFilters, InspectionFilterType } from '../../models';
import { EmpresaContextService } from '../../../../core/services/empresa-context.service';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EstadoUtilsService } from '../../utils/estado-utils.service';
import { InspectionStatusService } from '../../utils/inspection-status.service';
import { TmsButtonComponent } from '../../../../shared/components/tms-button/tms-button.component';
import { InspectionIndicatorComponent } from '../../components/inspection-indicator/inspection-indicator.component';
import { environment } from '../../../../../environments/environment';

// Interfaces para paginación
interface PaginatedEquipos {
  content: EquipoResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

@Component({
  selector: 'app-equipo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TmsButtonComponent, InspectionIndicatorComponent],
  templateUrl: './equipo-list.component.html',
  styleUrl: './equipo-list.component.css'
})
export class EquipoListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fleetService = inject(FleetService);
  private readonly equiposService = inject(EquiposService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly equiposEnhancedService = inject(EquiposEnhancedService);
  private readonly empresaContextService = inject(EmpresaContextService);
  private readonly authService = inject(AuthService);
  private readonly estadoUtils = inject(EstadoUtilsService);  private readonly inspectionStatusService = inject(InspectionStatusService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Estado del componente
  equipos: EquipoResponse[] = [];
  estadosEquipo: EstadoEquipoResponse[] = [];
  loading = false;
  error: string | null = null;
  
  // Filtros y búsqueda
  filterForm: FormGroup;
  currentFilters: EquipoFilters = {};

  // Opciones para el filtro de inspección
  inspectionFilterOptions = [
    { value: 'todos', label: 'Todos (Inspección)', description: 'Mostrar todos los equipos' },
    { value: 'al-dia', label: 'Inspección al Día', description: 'Menos de 20 días desde la última inspección' },
    { value: 'proxima', label: 'Inspección Próxima', description: 'Entre 20 y 30 días desde la última inspección' },
    { value: 'vencida', label: 'Inspección Vencida', description: 'Más de 30 días o sin registro de inspección' },
    { value: 'requiere-atencion', label: 'Requiere Atención', description: 'Incluye próximas a vencer y vencidas' }
  ];

  // Paginación
  pagination = {
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    size: 10,
    pageSizes: [10, 25, 50, 100]
  };

  // Ordenamiento
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Estados de carga más granulares
  loadingStates = {
    initializing: true,
    catalogos: false,
    equipos: false,
    authentication: false
  };

  // Estado del panel de inspecciones
  inspectionPanelState = {
    isVisible: true,
    isDismissed: false,
    lastDismissedTime: null as number | null
  };

  // Información de contexto para debugging (solo en desarrollo)
  debugInfo = {
    hasToken: false,
    hasEmpresa: false,
    empresaId: null as number | null,
    empresaName: '' as string
  };constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      estadoId: [''],
      estadoInspeccion: ['todos']
    });

    this.setupFilterSubscriptions();
    this.loadInspectionPanelPreferences();
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el componente con validaciones completas de autenticación
   */
  private initializeComponent(): void {
    this.loadingStates.initializing = true;
    this.error = null;

    // Verificar autenticación completa (token + empresa)
    combineLatest([
      this.authService.isAuthenticated(),
      this.empresaContextService.hasEmpresaSelected$,
      this.empresaContextService.validEmpresaContext$
    ]).pipe(
      takeUntil(this.destroy$),
      debounceTime(100) // Pequeño debounce para evitar múltiples verificaciones rápidas
    ).subscribe({
      next: ([isAuthenticated, hasEmpresa, empresaContext]) => {
        this.updateDebugInfo();

        if (!isAuthenticated) {
          this.handleAuthenticationError('No se encontró una sesión válida');
          return;
        }

        if (!hasEmpresa) {
          this.handleEmpresaSelectionError();
          return;
        }

        // Si llegamos aquí, todo está bien configurado
        this.loadingStates.initializing = false;
        this.loadInitialData();
      },
      error: (error) => {
        console.error('Error durante la inicialización:', error);
        this.handleAuthenticationError('Error al verificar la autenticación');
      }
    });
  }

  /**
   * Actualiza información de debug (solo visible en desarrollo)
   */
  private updateDebugInfo(): void {
    this.debugInfo.hasToken = !!this.authService.getToken();
    this.debugInfo.hasEmpresa = this.empresaContextService.hasSelectedEmpresa();
    this.debugInfo.empresaId = this.empresaContextService.getCurrentEmpresaId();

    const contextInfo = this.empresaContextService.getContextInfo();
    this.debugInfo.empresaName = contextInfo?.empresaName || '';
  }

  /**
   * Maneja errores de autenticación
   */
  private handleAuthenticationError(message: string): void {
    this.error = `${message}. Redirigiendo al login...`;
    this.loadingStates.initializing = false;
    this.loading = false;

    // Limpiar sesión y redirigir
    setTimeout(() => {
      this.authService.logout();
    }, 2000);
  }

  /**
   * Maneja errores de selección de empresa
   */
  private handleEmpresaSelectionError(): void {
    this.error = 'No se ha seleccionado una empresa. Redirigiendo...';
    this.loadingStates.initializing = false;
    this.loading = false;

    setTimeout(() => {
      this.router.navigate(['/auth/select-empresa']);
    }, 2000);
  }  /**
   * Carga datos iniciales necesarios (solo cuando la autenticación es válida)
   */
  private loadInitialData(): void {
    this.loadingStates.catalogos = true;
    this.error = null;

    // Cargar catálogos usando el servicio centralizado
    this.catalogosService.initializeCatalogos()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading catalogs:', error);

          // Verificar si es un error de autenticación
          if (error.status === 401) {
            this.handleAuthenticationError('Token de autenticación inválido o expirado');
            return of(false);
          }

          throw error;
        })
      )
      .subscribe({
        next: (success) => {
          this.loadingStates.catalogos = false;

          if (success) {
            // Suscribirse a estados de equipo desde el servicio de catálogos
            this.catalogosService.getEstadosEquipo()
              .pipe(takeUntil(this.destroy$))
              .subscribe(estados => {
                this.estadosEquipo = estados;
              });

            // Cargar equipos
            this.loadEquipos();
          } else {
            this.error = 'Error al cargar los catálogos. Verifique su conexión e intente nuevamente.';
          }
        },
        error: (error) => {
          this.loadingStates.catalogos = false;

          if (error.status !== 401) { // Los errores 401 ya se manejan arriba
            this.error = 'Error al cargar los catálogos. Verifique su conexión e intente nuevamente.';
            console.error('Error loading catalogs:', error);
          }
        }
      });
  }/**
   * Configura subscripciones para filtros con debounce
   */
  private setupFilterSubscriptions(): void {
    // Usar valueChanges del formulario completo en lugar de controles individuales
    // Esto asegura que obtenemos los valores actualizados después del cambio
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300), // Reducir debounce para mejor respuesta
        distinctUntilChanged((prev, curr) => {
          // Comparación personalizada para evitar aplicar filtros innecesarios
          return prev?.search === curr?.search && 
                 prev?.estadoId === curr?.estadoId &&
                 prev?.estadoInspeccion === curr?.estadoInspeccion;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((formValue) => {
        // Debug en desarrollo
        if (console && typeof console.log === 'function' && !environment.production) {
          console.log('📝 Formulario cambió:', formValue);
        }

        // Solo aplicar filtros si el componente está completamente inicializado
        if (!this.loadingStates.initializing && !this.loadingStates.catalogos) {
          this.applyFiltersFromFormValue(formValue);
        }
      });
  }  /**
   * Carga equipos usando el servicio mejorado con filtrado local y paginación
   */
  loadEquipos(): void {
    this.loadingStates.equipos = true;
    this.loading = true;
    this.error = null;

    // Verificación de seguridad antes de cargar
    if (!this.authService.getToken()) {
      this.handleAuthenticationError('Token de autenticación no encontrado');
      return;
    }

    const empresaId = this.empresaContextService.getCurrentEmpresaId();
    if (!empresaId) {
      this.handleEmpresaSelectionError();
      return;
    }

    // Construir filtros actuales
    const filtrosConEmpresa = {
      ...this.currentFilters,
      empresaId
    };

    // Usar el nuevo servicio mejorado para obtener equipos paginados con filtrado local
    this.equiposEnhancedService.getEquiposPaginated(
      empresaId,
      filtrosConEmpresa,
      this.pagination.currentPage,
      this.pagination.size
    ).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Error loading equipos:', error);

        // Manejar errores específicos
        if (error.status === 401) {
          this.handleAuthenticationError('Token de autenticación inválido o expirado');
          return of({
            equipos: [],
            totalElements: 0,
            totalPages: 0,
            currentPage: 0,
            pageSize: this.pagination.size
          });
        }

        if (error.status === 403) {
          this.error = 'No tiene permisos para acceder a los equipos de esta empresa.';
          return of({
            equipos: [],
            totalElements: 0,
            totalPages: 0,
            currentPage: 0,
            pageSize: this.pagination.size
          });
        }

        // Error genérico
        this.error = 'Error al cargar los equipos. Verifique su conexión e intente nuevamente.';
        return of({
          equipos: [],
          totalElements: 0,
          totalPages: 0,
          currentPage: 0,
          pageSize: this.pagination.size
        });
      })
    ).subscribe({
      next: (result) => {
        this.equipos = result.equipos;
        this.pagination.totalElements = result.totalElements;
        this.pagination.totalPages = result.totalPages;
        this.pagination.currentPage = result.currentPage;

        this.loadingStates.equipos = false;
        this.loading = false;

        // Debug en desarrollo
        if (!environment.production && console?.log) {
          console.log('✅ Equipos cargados exitosamente:', {
            filtros: filtrosConEmpresa,
            equiposEncontrados: result.equipos.length,
            totalElementos: result.totalElements,
            paginaActual: result.currentPage,
            totalPaginas: result.totalPages
          });
        }
      },
      error: (error) => {
        this.loadingStates.equipos = false;
        this.loading = false;
        console.error('Unexpected error in loadEquipos:', error);
      }
    });
  }
/**
   * Aplica filtros desde los valores del formulario 
   * (usado por valueChanges subscription)
   */  private applyFiltersFromFormValue(formValue: any): void {
    const empresaId = this.empresaContextService.getCurrentEmpresaId();

    if (!empresaId) {
      this.error = 'No se ha seleccionado una empresa.';
      return;
    }

    // Convertir estadoId a number si existe, ya que los select HTML devuelven strings
    let estadoId: number | undefined = undefined;
    if (formValue.estadoId && formValue.estadoId !== '' && formValue.estadoId !== '0') {
      estadoId = Number(formValue.estadoId);
      // Validar que la conversión fue exitosa
      if (isNaN(estadoId) || estadoId <= 0) {
        estadoId = undefined;
      }
    }

    // Construir filtros con validaciones
    this.currentFilters = {
      empresaId,
      estadoId,
      placa: formValue.search?.trim() || undefined,
      estadoInspeccion: formValue.estadoInspeccion || 'todos'
    };

    // Debug en desarrollo
    if (console && typeof console.log === 'function' && !environment.production) {
      console.log('🎯 Aplicando filtros desde valueChanges:', {
        formValue: formValue,
        estadoIdOriginal: formValue.estadoId,
        estadoIdProcesado: estadoId,
        estadoInspeccion: formValue.estadoInspeccion,
        filtrosFinales: this.currentFilters
      });
    }

    // Resetear paginación al aplicar filtros
    this.pagination.currentPage = 0;
    this.loadEquipos();
  }

  /**
   * Aplica filtros actuales (método público para botones)
   * Nota: Ahora usa los valores actuales del formulario directamente
   */
  applyFilters(): void {
    const formValue = this.filterForm.value;
    this.applyFiltersFromFormValue(formValue);
  }  /**
   * Limpia todos los filtros
   */  clearFilters(): void {
    const empresaId = this.empresaContextService.getCurrentEmpresaId();

    // Resetear formulario sin disparar valueChanges
    this.filterForm.setValue({
      search: '',
      estadoId: '',
      estadoInspeccion: 'todos'
    }, { emitEvent: false });

    // Limpiar filtros actuales manualmente
    this.currentFilters = { empresaId: empresaId || undefined };

    // Limpiar errores y resetear paginación
    this.error = null;
    this.pagination.currentPage = 0;

    // Debug
    if (console && typeof console.log === 'function' && !environment.production) {
      console.log('🧹 Filtros limpiados, recargando equipos...');
    }

    this.loadEquipos();
  }
  /**
   * Cambia la página actual (ahora usa filtrado local)
   */
  onPageChange(page: number): void {
    if (page >= 0 && page < this.pagination.totalPages) {
      this.pagination.currentPage = page;
      this.loadEquipos(); // El servicio maneja la paginación local
    }
  }

  /**
   * Cambia el tamaño de página (reinicia a página 0)
   */
  onPageSizeChange(size: number): void {
    this.pagination.size = size;
    this.pagination.currentPage = 0;
    this.loadEquipos(); // El servicio maneja la nueva paginación
  }  /**
   * Maneja ordenamiento de columnas (ahora usa el servicio mejorado)
   */
  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    // Ordenar equipos actuales usando el servicio
    this.equipos = this.equiposEnhancedService.sortEquipos(this.equipos, this.sortField, this.sortDirection);
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
   * Obtiene clase CSS para indicador de ordenamiento
   */
  getSortClass(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc';
  }
  /**
   * Verifica si hay filtros activos
   */
  get hasActiveFilters(): boolean {
    const formValue = this.filterForm.value;
    return !!(formValue.search?.trim() || 
             (formValue.estadoId && formValue.estadoId !== '' && formValue.estadoId !== '0') ||
             (formValue.estadoInspeccion && formValue.estadoInspeccion !== 'todos'));
  }

  /**
   * Cuenta cuántos filtros están activos
   */
  getActiveFiltersCount(): number {
    const formValue = this.filterForm.value;
    let count = 0;

    if (formValue.search?.trim()) count++;
    if (formValue.estadoId && formValue.estadoId !== '' && formValue.estadoId !== '0') count++;
    if (formValue.estadoInspeccion && formValue.estadoInspeccion !== 'todos') count++;

    return count;
  }

  /**
   * Obtiene descripción de filtros activos para UX
   */
  getActiveFiltersDescription(): string {
    const formValue = this.filterForm.value;
    const filters: string[] = [];

    if (formValue.search?.trim()) {
      filters.push(`Búsqueda: "${formValue.search.trim()}"`);
    }

    if (formValue.estadoId && formValue.estadoId !== '' && formValue.estadoId !== '0') {
      const estado = this.estadosEquipo.find(e => e.id === Number(formValue.estadoId));
      if (estado) {
        filters.push(`Estado: ${estado.nombre}`);
      }
    }

    if (formValue.estadoInspeccion && formValue.estadoInspeccion !== 'todos') {
      const inspectionFilter = this.inspectionFilterOptions.find(f => f.value === formValue.estadoInspeccion);
      if (inspectionFilter) {
        filters.push(`Inspección: ${inspectionFilter.label}`);
      }
    }

    return filters.join(' | ');
  }

  /**
   * Obtiene clase CSS para estado del equipo usando el servicio de utilidades
   */
  getEstadoClass(estado: EstadoEquipoResponse | undefined): string {
    return this.estadoUtils.getCssClass(estado);
  }

  /**
   * Obtiene descripción del estado para tooltips
   */
  getEstadoDescription(estado: EstadoEquipoResponse | undefined): string {
    return this.estadoUtils.getDescription(estado);
  }

  /**
   * Verifica si un estado requiere atención
   */
  estadoRequiereAtencion(estado: EstadoEquipoResponse | undefined): boolean {
    return this.estadoUtils.requiresAttention(estado);
  }

  /**
   * Genera array de páginas para paginación
   */
  get paginationPages(): number[] {
    const pages: number[] = [];
    const totalPages = this.pagination.totalPages;
    const currentPage = this.pagination.currentPage;

    // Mostrar máximo 5 páginas
    const maxVisible = 5;
    let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);

    // Ajustar inicio si estamos cerca del final
    if (end - start < maxVisible - 1) {
      start = Math.max(0, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }
  /**
   * Navega a formulario de nuevo equipo
   */
  onNuevoEquipo(): void {
    this.router.navigate(['/equipos/nuevo']);
  }

  /**
   * Navega a detalle/edición de equipo
   */
  onEditarEquipo(equipo: EquipoResponse): void {
    this.router.navigate(['/equipos/editar', equipo.id]);
  }

  /**
   * Maneja acción de ver detalle del equipo
   */
  onVerDetalle(equipo: EquipoResponse): void {
    this.router.navigate(['/equipos/detalle', equipo.id]);
  }

  /**
   * Función de trackBy para optimizar el renderizado de la lista
   */
  trackByEquipoId(index: number, equipo: EquipoResponse): number {
    return equipo.id;
  }

  /**
   * Getter para Math.min usado en el template
   */
  get Math() {
    return Math;
  }
  /**
   * Getter para obtener información de la empresa seleccionada
   */
  get selectedEmpresa() {
    return this.empresaContextService.getSelectedEmpresa();
  }
  /**
   * Getter para obtener el ID de la empresa seleccionada
   */
  get empresaId(): number | null {
    return this.empresaContextService.getCurrentEmpresaId();
  }  /**
   * Actualiza los datos FORZANDO la recarga desde el servidor
   * Este método ignora completamente el cache y solicita datos frescos
   */
  refreshData(): void {
    // Limpiar cualquier error previo
    this.error = null;
    
    // Establecer estado de carga inmediatamente para activar la animación
    this.loading = true;
    this.loadingStates.equipos = true;
    
    // Limpiar datos actuales para mostrar un estado de carga limpio
    this.equipos = [];
    this.pagination.totalElements = 0;
    this.pagination.totalPages = 0;
    this.pagination.currentPage = 0;
    
    const empresaId = this.empresaContextService.getCurrentEmpresaId();
    if (!empresaId) {
      this.handleEmpresaSelectionError();
      return;
    }

    // Debug en desarrollo
    if (!environment.production && console?.log) {
      console.log('🔄 Refrescando datos desde el servidor (ignorando cache)...');
    }

    // PASO 1: Forzar recarga de catálogos (opcional pero recomendado)
    // Los catálogos cambian menos frecuentemente, así que es opcional
    this.catalogosService.reloadCatalogos({ showSuccessNotification: false })
      .pipe(
        // PASO 2: Forzar recarga de equipos (SIEMPRE)
        switchMap(() => {
          // Limpiar cache de equipos para esta empresa antes de recargar
          this.equiposEnhancedService.clearCacheForEmpresa(empresaId);
          
          // Forzar recarga desde servidor
          return this.equiposEnhancedService.refreshEquipos(empresaId, { 
            showSuccessNotification: false 
          });
        }),
        // PASO 3: Aplicar filtros actuales después de la recarga
        switchMap(() => {
          const formValue = this.filterForm.value;
          const filtros = this.buildFiltersFromFormValue(formValue, empresaId);
          
          return this.equiposEnhancedService.getEquiposPaginated(
            empresaId,
            filtros,
            this.pagination.currentPage,
            this.pagination.size
          );
        }),
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error during forced refresh:', error);
          
          if (error.status === 401) {
            this.handleAuthenticationError('Token de autenticación inválido o expirado');
          } else {
            this.error = 'Error al actualizar los datos. Verifique su conexión e intente nuevamente.';
          }
          
          this.loading = false;
          this.loadingStates.equipos = false;
          
          return of({
            equipos: [],
            totalElements: 0,
            totalPages: 0,
            currentPage: 0,
            pageSize: this.pagination.size
          });
        })
      )
      .subscribe({
        next: (result) => {
          // Actualizar datos con la respuesta fresca del servidor
          this.equipos = result.equipos;
          this.pagination.totalElements = result.totalElements;
          this.pagination.totalPages = result.totalPages;
          this.pagination.currentPage = result.currentPage;

          // Finalizar estados de carga
          this.loading = false;
          this.loadingStates.equipos = false;

          // Debug en desarrollo
          if (!environment.production && console?.log) {
            console.log('✅ Datos refrescados exitosamente desde el servidor:', {
              equiposEncontrados: result.equipos.length,
              totalElementos: result.totalElements,
              cacheIgnorado: true,
              timestamp: new Date().toISOString()
            });
          }          // Mostrar notificación de éxito
          this.notificationService.success('Datos actualizados desde el servidor');
        },
        error: (error) => {
          this.loading = false;
          this.loadingStates.equipos = false;
          console.error('Unexpected error during refresh:', error);
        }
      });
  }

  /**
   * Getter para verificar si está cargando algún componente
   * Mejorado para manejar mejor el estado inicial
   */
  get isLoading(): boolean {
    return this.loadingStates.initializing ||
      this.loadingStates.catalogos ||
      this.loadingStates.equipos ||
      this.loadingStates.authentication ||
      this.loading; // Incluir loading como fallback
  }

  /**
   * Getter para verificar si es la primera carga
   */
  get isInitialLoading(): boolean {
    return this.loadingStates.initializing || this.loadingStates.catalogos;
  }

  /**
   * Método para reintentar la carga de datos
   */
  retryLoadData(): void {
    this.error = null;
    this.initializeComponent();
  }

  /**
   * Utilidad para logging de debug (solo en desarrollo)
   */
  private debugLog(message: string, data?: any): void {
    // Solo hacer log en modo desarrollo
    if (console && typeof console.log === 'function' && !environment.production) {
      if (data) {
        console.log(`🔧 [EquipoList] ${message}`, data);
      } else {
        console.log(`🔧 [EquipoList] ${message}`);
      }
    }
  }

  /**
   * Valida que los datos de estados estén cargados correctamente
   */
  private validateEstadosData(): boolean {
    if (!this.estadosEquipo || this.estadosEquipo.length === 0) {
      this.debugLog('⚠️ Estados de equipo no cargados o vacíos');
      return false;
    }

    // Verificar que todos los estados tienen ID y nombre
    const invalidEstados = this.estadosEquipo.filter(estado => !estado.id || !estado.nombre);
    if (invalidEstados.length > 0) {
      this.debugLog('⚠️ Estados inválidos encontrados:', invalidEstados);
      return false;
    }

    this.debugLog('✅ Estados validados correctamente:', {
      total: this.estadosEquipo.length,
      estados: this.estadosEquipo.map(e => ({ id: e.id, nombre: e.nombre }))
    });

    return true;
  }  /**
   * Obtiene un resumen del estado de inspecciones de todos los equipos
   * Este método incluye TODOS los equipos para mantener los indicadores visuales
   */
  getInspectionsSummary() {
    return this.inspectionStatusService.getInspectionsSummary(this.equipos);
  }

  /**
   * Obtiene un resumen del estado de inspecciones para el panel de conteo
   * Este método EXCLUYE equipos con estado "Indisponible" e "Inactivo" de los contadores
   */
  getInspectionsSummaryForCounts() {
    return this.inspectionStatusService.getInspectionsSummaryForCounts(this.equipos);
  }

  /**
   * Obtiene equipos con inspecciones vencidas (TODOS los equipos para indicadores visuales)
   */
  getEquiposWithOverdueInspections(): EquipoResponse[] {
    return this.equipos.filter(equipo => 
      this.inspectionStatusService.isInspectionOverdue(equipo.fechaInspeccion)
    );
  }

  /**
   * Obtiene equipos con inspecciones vencidas excluyendo estados específicos (para contadores)
   */
  getEquiposWithOverdueInspectionsForCounts(): EquipoResponse[] {
    return this.equipos.filter(equipo => {
      // Primero verificar el estado del equipo
      if (equipo.estadoEquipoResponse?.nombre) {
        const estadoNombre = equipo.estadoEquipoResponse.nombre.toLowerCase().trim();
        if (estadoNombre === 'indisponible' || estadoNombre === 'inactivo') {
          return false; // Excluir de los contadores
        }
      }
      
      // Luego verificar si la inspección está vencida
      return this.inspectionStatusService.isInspectionOverdue(equipo.fechaInspeccion);
    });
  }

  /**
   * Obtiene el estado de inspección para un equipo específico
   */
  getInspectionStatus(fechaInspeccion: Date | string | null | undefined) {
    return this.inspectionStatusService.calculateInspectionStatus(fechaInspeccion);
  }
  /**
   * Verifica si hay equipos con inspecciones críticas (para mostrar/ocultar el panel)
   * Usa el conteo excluyendo equipos con estados específicos
   */
  get hasCriticalInspections(): boolean {
    return this.getEquiposWithOverdueInspectionsForCounts().length > 0;
  }
  /**
   * Obtiene el conteo de equipos por estado de inspección
   * Usa el método que excluye equipos con estados específicos para los contadores
   */
  get inspectionStatusCounts() {
    const summary = this.getInspectionsSummaryForCounts();
    return {
      critical: summary.critical,
      warning: summary.warning,
      good: summary.good,
      total: summary.total
    };
  }

  // ==================== MÉTODOS DEL PANEL DE INSPECCIONES ====================

  /**
   * Determina si el panel de inspecciones debe mostrarse
   */
  get shouldShowInspectionPanel(): boolean {
    return this.hasCriticalInspections && 
           this.inspectionPanelState.isVisible && 
           !this.inspectionPanelState.isDismissed;
  }

  /**
   * Cierra el panel de inspecciones
   */
  dismissInspectionPanel(): void {
    this.inspectionPanelState.isDismissed = true;
    this.inspectionPanelState.isVisible = false;
    this.inspectionPanelState.lastDismissedTime = Date.now();
    this.saveInspectionPanelPreferences();
  }

  /**
   * Restaura el panel de inspecciones (opcional, para casos donde el usuario quiera verlo de nuevo)
   */
  showInspectionPanel(): void {
    this.inspectionPanelState.isDismissed = false;
    this.inspectionPanelState.isVisible = true;
    this.inspectionPanelState.lastDismissedTime = null;
    this.saveInspectionPanelPreferences();
  }

  /**
   * Carga las preferencias del panel desde localStorage
   */
  private loadInspectionPanelPreferences(): void {
    try {
      const stored = localStorage.getItem('tms-inspection-panel-preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        
        // Si fue cerrado hace más de 24 horas, volver a mostrarlo
        const dayInMs = 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        if (preferences.lastDismissedTime && 
            (now - preferences.lastDismissedTime) > dayInMs) {
          // Reset después de 24 horas
          this.inspectionPanelState.isDismissed = false;
          this.inspectionPanelState.isVisible = true;
          this.inspectionPanelState.lastDismissedTime = null;
        } else {
          this.inspectionPanelState = {
            ...this.inspectionPanelState,
            ...preferences
          };
        }
      }
    } catch (error) {
      console.warn('Error al cargar preferencias del panel de inspecciones:', error);
      // En caso de error, usar valores por defecto (panel visible)
    }
  }

  /**
   * Guarda las preferencias del panel en localStorage
   */
  private saveInspectionPanelPreferences(): void {
    try {
      localStorage.setItem('tms-inspection-panel-preferences', 
        JSON.stringify(this.inspectionPanelState));
    } catch (error) {
      console.warn('Error al guardar preferencias del panel de inspecciones:', error);
    }
  }

  /**
   * Construye filtros desde los valores del formulario
   * (método auxiliar para refreshData)
   */
  private buildFiltersFromFormValue(formValue: any, empresaId: number): EquipoFilters {
    // Convertir estadoId a number si existe
    let estadoId: number | undefined = undefined;
    if (formValue.estadoId && formValue.estadoId !== '' && formValue.estadoId !== '0') {
      estadoId = Number(formValue.estadoId);
      if (isNaN(estadoId) || estadoId <= 0) {
        estadoId = undefined;
      }
    }

    return {
      empresaId,
      estadoId,
      placa: formValue.search?.trim() || undefined,
      estadoInspeccion: formValue.estadoInspeccion || 'todos'
    };
  }
}