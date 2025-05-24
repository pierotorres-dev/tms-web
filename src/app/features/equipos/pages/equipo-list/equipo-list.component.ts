import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, combineLatest } from 'rxjs/operators';

// Importar servicios y modelos
import { FleetService, EquiposService } from '../../services';
import { EquipoResponseDto, EstadoEquipoDto, EquipoFilters } from '../../models';
import { EmpresaContextService } from '../../../../core/services/empresa-context.service';
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

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      estadoId: [''],
      tipoEquipo: ['']
    });

    this.setupFilterSubscriptions();
  }  ngOnInit(): void {
    // Verificar que hay una empresa seleccionada antes de inicializar
    if (!this.empresaContextService.hasSelectedEmpresa()) {
      this.error = 'No se ha seleccionado una empresa. Redirigiendo...';
      setTimeout(() => {
        this.router.navigate(['/auth/select-empresa']);
      }, 2000);
      return;
    }

    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /**
   * Carga datos iniciales necesarios
   */
  private loadInitialData(): void {
    this.loading = true;
    this.error = null;    // Escuchar cambios en la empresa seleccionada y recargar datos cuando cambie
    this.empresaContextService.selectedEmpresa$
      .pipe(takeUntil(this.destroy$))
      .subscribe(empresa => {
        if (empresa) {
          this.loadCatalogosAndEquipos();
        } else {
          this.error = 'No se ha seleccionado una empresa.';
          this.loading = false;
        }
      });
  }

  /**
   * Carga catálogos y equipos
   */
  private loadCatalogosAndEquipos(): void {
    // Cargar catálogos
    this.fleetService.loadCatalogos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
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
          this.error = 'Error al cargar los catálogos. Por favor, intente nuevamente.';
          this.loading = false;
          console.error('Error loading catalogs:', error);
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
  }
  /**
   * Carga equipos con filtros y paginación
   */
  loadEquipos(): void {
    this.loading = true;
    this.error = null;    // Obtener empresaId del EmpresaContextService
    const empresaId = this.empresaContextService.getCurrentEmpresaId();
    
    if (!empresaId) {
      this.error = 'No se ha seleccionado una empresa. Por favor, seleccione una empresa.';
      this.loading = false;
      this.router.navigate(['/auth/select-empresa']);
      return;
    }

    // Actualizar filtros con empresaId
    const filtrosConEmpresa = {
      ...this.currentFilters,
      empresaId
    };

    // TODO: Implementar cuando el servicio soporte paginación
    // Por ahora simulamos la paginación en el frontend
    this.equiposService.searchEquipos(filtrosConEmpresa, { showErrorNotification: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (equipos) => {
          this.processEquiposData(equipos);
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar los equipos. Por favor, intente nuevamente.';
          this.loading = false;
          console.error('Error loading equipos:', error);
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
}