import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, combineLatest, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, filter, catchError } from 'rxjs/operators';

// Importar servicios y modelos
import { FleetService, EquiposService } from '../../services';
import { EquipoResponse, EstadoEquipoResponse, EquipoFilters } from '../../models';
import { EmpresaContextService } from '../../../../core/services/empresa-context.service';
import { AuthService } from '../../../auth/services/auth.service';
import { EstadoUtilsService } from '../../utils/estado-utils.service';
import { TmsButtonComponent } from '../../../../shared/components/tms-button/tms-button.component';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TmsButtonComponent],
  templateUrl: './equipo-list.component.html',
  styleUrl: './equipo-list.component.css'
})
export class EquipoListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fleetService = inject(FleetService);
  private readonly equiposService = inject(EquiposService);
  private readonly empresaContextService = inject(EmpresaContextService);
  private readonly authService = inject(AuthService);
  private readonly estadoUtils = inject(EstadoUtilsService);
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

  // Información de contexto para debugging (solo en desarrollo)
  debugInfo = {
    hasToken: false,
    hasEmpresa: false,
    empresaId: null as number | null,
    empresaName: '' as string
  };
  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      estadoId: ['']
    });

    this.setupFilterSubscriptions();
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
  }
  /**
   * Carga datos iniciales necesarios (solo cuando la autenticación es válida)
   */
  private loadInitialData(): void {
    this.loadingStates.catalogos = true;
    this.error = null;

    // Cargar catálogos primero
    this.fleetService.loadCatalogos()
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading catalogs:', error);

          // Verificar si es un error de autenticación
          if (error.status === 401) {
            this.handleAuthenticationError('Token de autenticación inválido o expirado');
            return of([]);
          }

          throw error;
        })
      )
      .subscribe({
        next: () => {
          this.loadingStates.catalogos = false;

          // Suscribirse a estados de equipo
          this.fleetService.estadosEquipo$
            .pipe(takeUntil(this.destroy$))
            .subscribe(estados => {
              this.estadosEquipo = estados;
            });

          // Cargar equipos
          this.loadEquipos();
        },
        error: (error) => {
          this.loadingStates.catalogos = false;

          if (error.status !== 401) { // Los errores 401 ya se manejan arriba
            this.error = 'Error al cargar los catálogos. Verifique su conexión e intente nuevamente.';
            console.error('Error loading catalogs:', error);
          }
        }
      });
  }  /**
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
          return prev?.search === curr?.search && prev?.estadoId === curr?.estadoId;
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
  }/**
   * Carga equipos con validaciones mejoradas
   */
  loadEquipos(): void {
    this.loadingStates.equipos = true;
    this.loading = true; // Asegurar que se muestre el loading
    this.error = null; // Limpiar errores previos

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

    // Actualizar filtros con empresaId
    const filtrosConEmpresa = {
      ...this.currentFilters,
      empresaId
    };

    this.equiposService.searchEquipos(filtrosConEmpresa, { showErrorNotification: false })
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading equipos:', error);

          // Manejar errores específicos
          if (error.status === 401) {
            this.handleAuthenticationError('Su sesión ha expirado');
            return of([]);
          } else if (error.status === 403) {
            this.error = 'No tiene permisos para acceder a los equipos de esta empresa.';
            this.loadingStates.equipos = false;
            return of([]);
          }

          throw error;
        })
      )
      .subscribe({
        next: (equipos) => {
          this.processEquiposData(equipos);
          this.loadingStates.equipos = false;
          this.loading = false;
        },
        error: (error) => {
          this.loadingStates.equipos = false;
          this.loading = false;

          if (error.status !== 401 && error.status !== 403) { // Estos ya se manejan arriba
            this.error = 'Error al cargar los equipos. Verifique su conexión e intente nuevamente.';
          }
        }
      });
  }

  /**
   * Procesa datos de equipos para paginación frontend
   */
  private processEquiposData(allEquipos: EquipoResponse[]): void {
    const startIndex = this.pagination.currentPage * this.pagination.size;
    const endIndex = startIndex + this.pagination.size;

    this.equipos = allEquipos.slice(startIndex, endIndex);
    this.pagination.totalElements = allEquipos.length;
    this.pagination.totalPages = Math.ceil(allEquipos.length / this.pagination.size);
  }  /**
   * Aplica filtros desde los valores del formulario 
   * (usado por valueChanges subscription)
   */
  private applyFiltersFromFormValue(formValue: any): void {
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
      placa: formValue.search?.trim() || undefined
    };

    // Debug en desarrollo
    if (console && typeof console.log === 'function' && !environment.production) {
      console.log('🎯 Aplicando filtros desde valueChanges:', {
        formValue: formValue,
        estadoIdOriginal: formValue.estadoId,
        estadoIdProcesado: estadoId,
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
   */
  clearFilters(): void {
    const empresaId = this.empresaContextService.getCurrentEmpresaId();

    // Resetear formulario sin disparar valueChanges
    this.filterForm.setValue({
      search: '',
      estadoId: ''
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
   * Cambia la página currentPage
   */
  onPageChange(page: number): void {
    if (page >= 0 && page < this.pagination.totalPages) {
      this.pagination.currentPage = page;
      this.loadEquipos();
    }
  }

  /**
   * Cambia el tamaño de página
   */
  onPageSizeChange(size: number): void {
    this.pagination.size = size;
    this.pagination.currentPage = 0;
    this.loadEquipos();
  }

  /**
   * Maneja ordenamiento de columnas
   */
  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    // Ordenar equipos actuales
    this.equipos.sort((a, b) => {
      const aValue = this.getFieldValue(a, field);
      const bValue = this.getFieldValue(b, field);

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
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
        return equipo.equipo?.toLowerCase() || ''; case 'estado':
        return equipo.estadoEquipoResponse?.nombre.toLowerCase() || '';
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
    return !!(formValue.search?.trim() || (formValue.estadoId && formValue.estadoId !== '' && formValue.estadoId !== '0'));
  }

  /**
   * Cuenta cuántos filtros están activos
   */
  getActiveFiltersCount(): number {
    const formValue = this.filterForm.value;
    let count = 0;

    if (formValue.search?.trim()) count++;
    if (formValue.estadoId && formValue.estadoId !== '' && formValue.estadoId !== '0') count++;

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
  }

  /**
   * Actualiza los datos refrescando desde el servidor
   */
  refreshData(): void {
    // Limpiar cualquier error previo
    this.error = null;
    
    // Establecer estado de carga inmediatamente para activar la animación
    this.loading = true;
    
    // Limpiar datos actuales para mostrar un estado de carga limpio
    // Esto evita que se muestren datos obsoletos mientras se cargan los nuevos
    this.equipos = [];
    this.pagination.totalElements = 0;
    this.pagination.totalPages = 0;
    this.pagination.currentPage = 0;
    
    // Limpiar filtros aplicados para una refresh completa
    this.filterForm.reset({
      tipoEquipoId: '',
      estadoId: '',
      search: ''
    });
    
    // Pequeño delay para asegurar que la animación sea visible
    // Especialmente útil para conexiones rápidas
    setTimeout(() => {
      // Recargar datos desde el servidor
      // El método loadEquipos() manejará el estado de loading internamente
      this.loadEquipos();
    }, 100); // 100ms delay mínimo para UX
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
  }
}