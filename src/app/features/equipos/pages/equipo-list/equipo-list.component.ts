import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, combineLatest, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, filter, catchError } from 'rxjs/operators';

// Importar servicios y modelos
import { FleetService, EquiposService } from '../../services';
import { EquipoResponseDto, EstadoEquipoDto, EquipoFilters } from '../../models';
import { EmpresaContextService } from '../../../../core/services/empresa-context.service';
import { AuthService } from '../../../auth/services/auth.service';
import { TmsButtonComponent } from '../../../../shared/components/tms-button/tms-button.component';

// Interfaces para paginación
interface PaginatedEquipos {
  content: EquipoResponseDto[];
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
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Estado del componente
  equipos: EquipoResponseDto[] = [];
  estadosEquipo: EstadoEquipoDto[] = [];
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

  // Tipos de equipos disponibles (se puede expandir desde catálogos)
  tiposEquipo = [
    { value: 'CAMION', label: 'Camión' },
    { value: 'GRUA', label: 'Grúa' },
    { value: 'STACKER', label: 'Stacker' },
    { value: 'MONTACARGA', label: 'Montacarga' },
    { value: 'OTRO', label: 'Otro' }
  ];
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
      estadoId: [''],
      tipoEquipo: ['']
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
  }
  /**
   * Configura subscripciones para filtros con debounce
   */
  private setupFilterSubscriptions(): void {
    // Búsqueda con debounce
    this.filterForm.get('search')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });

    // Filtros inmediatos
    this.filterForm.get('estadoId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });

    this.filterForm.get('tipoEquipo')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }  /**
   * Carga equipos con validaciones mejoradas
   */
  loadEquipos(): void {
    this.loadingStates.equipos = true;
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
  private processEquiposData(allEquipos: EquipoResponseDto[]): void {
    const startIndex = this.pagination.currentPage * this.pagination.size;
    const endIndex = startIndex + this.pagination.size;
    
    this.equipos = allEquipos.slice(startIndex, endIndex);
    this.pagination.totalElements = allEquipos.length;
    this.pagination.totalPages = Math.ceil(allEquipos.length / this.pagination.size);
  }
  /**
   * Aplica filtros actuales
   */  applyFilters(): void {
    const formValue = this.filterForm.value;
    const empresaId = this.empresaContextService.getCurrentEmpresaId();
    
    if (!empresaId) {
      this.error = 'No se ha seleccionado una empresa.';
      return;
    }
    
    this.currentFilters = {
      search: formValue.search?.trim() || undefined,
      estadoId: formValue.estadoId || undefined,
      tipoEquipo: formValue.tipoEquipo || undefined,
      empresaId
    };

    // Resetear paginación al aplicar filtros
    this.pagination.currentPage = 0;
    this.loadEquipos();
  }
  /**
   * Limpia todos los filtros
   */  clearFilters(): void {
    const empresaId = this.empresaContextService.getCurrentEmpresaId();
    
    this.filterForm.reset();
    this.currentFilters = { empresaId: empresaId || undefined };
    this.pagination.currentPage = 0;
    this.loadEquipos();
  }

  /**
   * Cambia la página actual
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
  private getFieldValue(equipo: EquipoResponseDto, field: string): any {
    switch (field) {
      case 'placa':
        return equipo.placa?.toLowerCase() || '';
      case 'tipoEquipo':
        return equipo.tipoEquipo?.toLowerCase() || '';
      case 'marca':
        return equipo.marca?.toLowerCase() || '';
      case 'modelo':
        return equipo.modelo?.toLowerCase() || '';
      case 'estado':
        return equipo.estadoEquipoResponse?.nombre?.toLowerCase() || '';
      case 'anio':
        return equipo.anio || 0;
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
    return !!(this.currentFilters.search || 
              this.currentFilters.estadoId || 
              this.currentFilters.tipoEquipo);
  }

  /**
   * Obtiene clase CSS para estado del equipo
   */
  getEstadoClass(estado: EstadoEquipoDto): string {
    const estadoNombre = estado.nombre?.toLowerCase() || '';
    
    switch (estadoNombre) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'inactivo':
        return 'bg-gray-100 text-gray-800';
      case 'en_mantenimiento':
      case 'en mantenimiento':
        return 'bg-yellow-100 text-yellow-800';
      case 'de_baja':
      case 'de baja':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
  onEditarEquipo(equipo: EquipoResponseDto): void {
    this.router.navigate(['/equipos/editar', equipo.id]);
  }

  /**
   * Maneja acción de ver detalle del equipo
   */
  onVerDetalle(equipo: EquipoResponseDto): void {
    this.router.navigate(['/equipos/detalle', equipo.id]);
  }

  /**
   * Función de trackBy para optimizar el renderizado de la lista
   */
  trackByEquipoId(index: number, equipo: EquipoResponseDto): number {
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
  get empresaId() {
    return this.empresaContextService.getCurrentEmpresaId();
  }

  /**
   * Getter para verificar si está cargando algún componente
   */
  get isLoading(): boolean {
    return this.loadingStates.initializing || 
           this.loadingStates.catalogos || 
           this.loadingStates.equipos || 
           this.loadingStates.authentication;
  }

  /**
   * Método para reintentar la carga de datos
   */
  retryLoadData(): void {
    this.error = null;
    this.initializeComponent();
  }
}