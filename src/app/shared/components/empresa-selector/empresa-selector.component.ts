import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';

@Component({
  selector: 'app-empresa-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block text-left">
      <!-- Trigger Button -->
      <button
        (click)="isOpen = !isOpen"
        class="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        [class.ring-2]="isOpen"
        [class.ring-blue-500]="isOpen">
        
        <div class="flex items-center space-x-2">
          <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
            {{ getEmpresaInitials(selectedEmpresa?.nombre || '') }}
          </div>
          <span class="truncate max-w-32">{{ selectedEmpresa?.nombre || 'Seleccionar empresa' }}</span>
        </div>
        
        <svg class="ml-2 h-4 w-4 transition-transform duration-200" 
             [class.transform]="isOpen" 
             [class.rotate-180]="isOpen"
             xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown Panel -->
      <div 
        *ngIf="isOpen"
        class="absolute z-50 mt-2 w-80 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        role="menu"
        aria-orientation="vertical">
        
        <!-- Current Empresa Header -->
        <div class="px-4 py-3 bg-gray-50 rounded-t-lg border-b border-gray-200" *ngIf="selectedEmpresa">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {{ getEmpresaInitials(selectedEmpresa.nombre) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ selectedEmpresa.nombre }}</p>
              <p class="text-xs text-blue-600 font-medium">ID: {{ selectedEmpresa.id }}</p>
            </div>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Actual
            </span>
          </div>
        </div>
        
        <!-- Available Empresas -->
        <div class="py-1" *ngIf="otherEmpresas.length > 0">
          <div class="px-4 py-2">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Cambiar a otra empresa</p>
          </div>
          <button
            *ngFor="let empresa of otherEmpresas; trackBy: trackByEmpresaId"
            (click)="switchToEmpresa(empresa)"
            class="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-200"
            role="menuitem">
            <div class="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
              {{ getEmpresaInitials(empresa.nombre) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ empresa.nombre }}</p>
              <p class="text-xs text-gray-600">ID: {{ empresa.id }}</p>
            </div>
            <svg class="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <!-- Single Empresa Message -->
        <div class="px-4 py-3 text-center" *ngIf="otherEmpresas.length === 0">
          <p class="text-xs text-gray-500">Solo tienes acceso a esta empresa</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Animation for dropdown */
    .dropdown-enter {
      animation: dropdownEnter 0.2s ease-out;
    }

    @keyframes dropdownEnter {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class EmpresaSelectorComponent implements OnInit {
  private empresaContextService = inject(EmpresaContextService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() empresaChanged = new EventEmitter<EmpresaInfo>();

  isOpen = false;
  selectedEmpresa: EmpresaInfo | null = null;
  availableEmpresas: EmpresaInfo[] = [];

  ngOnInit(): void {
    // Subscribe to empresa context
    this.empresaContextService.selectedEmpresa$.subscribe(
      empresa => {
        this.selectedEmpresa = empresa;
      }
    );

    // Load available empresas
    this.availableEmpresas = this.empresaContextService.getAvailableEmpresas();
  }

  /**
   * Get empresas that are not currently selected
   */
  get otherEmpresas(): EmpresaInfo[] {
    if (!this.selectedEmpresa) return this.availableEmpresas;
    return this.availableEmpresas.filter(empresa => empresa.id !== this.selectedEmpresa!.id);
  }

  /**
   * Generate initials for empresa name
   */
  getEmpresaInitials(nombre: string): string {
    if (!nombre) return '??';

    const words = nombre.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return words.slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  /**
   * Switch to another empresa
   */
  switchToEmpresa(empresa: EmpresaInfo): void {
    this.isOpen = false;
    
    // Navigate to empresa selection if needed
    if (this.availableEmpresas.length > 1) {
      // Store the selected empresa and navigate to select-empresa page
      // The select-empresa component will handle the token generation
      this.router.navigate(['/auth/select-empresa']);
    } else {
      // Direct empresa switch
      this.empresaContextService.setSelectedEmpresa(empresa);
    }
  }

  /**
   * TrackBy function for empresa list optimization
   */
  trackByEmpresaId(index: number, empresa: EmpresaInfo): number {
    return empresa.id;
  }
}
