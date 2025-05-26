import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-empresa-selector-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modal Backdrop -->
    <div 
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      (click)="onBackdropClick($event)">
      
      <!-- Modal Container -->
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">
            Cambiar Empresa
          </h3>
          <button 
            (click)="closeModal()"
            class="text-gray-400 hover:text-gray-600 focus:outline-none"
            type="button">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Current Company Info -->
        <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200" *ngIf="currentEmpresa">
          <p class="text-sm text-blue-700 mb-2">Empresa actual:</p>
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
              {{ getEmpresaInitials(currentEmpresa.nombre) }}
            </div>
            <span class="text-sm font-medium text-blue-800">{{ currentEmpresa.nombre }}</span>
          </div>
        </div>

        <!-- Company List -->
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div 
            *ngFor="let empresa of availableEmpresas; trackBy: trackByEmpresaId"
            class="flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors duration-200"
            [class]="getEmpresaCardClasses(empresa)"
            (click)="selectEmpresa(empresa)">
            
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {{ getEmpresaInitials(empresa.nombre) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ empresa.nombre }}</p>
              </div>
            </div>

            <div *ngIf="empresa.id === currentEmpresa?.id" class="flex items-center">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Actual
              </span>
            </div>

            <div *ngIf="empresa.id !== currentEmpresa?.id" class="flex items-center">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-sm text-gray-600">Cambiando empresa...</span>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button 
            (click)="closeModal()"
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EmpresaSelectorModalComponent implements OnInit {
  private empresaContextService = inject(EmpresaContextService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  @Input() isOpen = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() empresaChanged = new EventEmitter<EmpresaInfo>();

  availableEmpresas: EmpresaInfo[] = [];
  currentEmpresa: EmpresaInfo | null = null;
  isLoading = false;

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.availableEmpresas = this.empresaContextService.getAvailableEmpresas();
    this.currentEmpresa = this.empresaContextService.getSelectedEmpresa();
  }

  selectEmpresa(empresa: EmpresaInfo): void {
    if (empresa.id === this.currentEmpresa?.id) {
      // Si es la misma empresa, no hacer nada
      return;
    }

    this.isLoading = true;

    // Actualizar la empresa seleccionada usando el contexto service
    this.empresaContextService.setSelectedEmpresa(empresa);
      // Mostrar notificación de éxito
    this.notificationService.success(
      `Empresa cambiada a: ${empresa.nombre}`
    );

    // Emitir evento de cambio
    this.empresaChanged.emit(empresa);

    // Cerrar modal después de un breve delay para mostrar el feedback
    setTimeout(() => {
      this.isLoading = false;
      this.closeModal();
    }, 500);
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  trackByEmpresaId(index: number, empresa: EmpresaInfo): number {
    return empresa.id;
  }

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

  getEmpresaCardClasses(empresa: EmpresaInfo): string {
    const baseClasses = 'border-gray-200';
    
    if (empresa.id === this.currentEmpresa?.id) {
      return `${baseClasses} border-green-200 bg-green-50`;
    }
    
    return `${baseClasses} hover:border-blue-300 hover:bg-blue-50`;
  }
}
