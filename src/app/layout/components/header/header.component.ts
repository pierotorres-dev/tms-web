import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';
import { EmpresaSelectorModalComponent } from '../../../shared/components/empresa-selector-modal/empresa-selector-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, ClickOutsideDirective, EmpresaSelectorModalComponent],
  template: `
    <header class="bg-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Left section: Logo and sidebar toggle -->
          <div class="flex items-center">
            <button 
              (click)="toggleSidebar()"
              class="p-2 mr-2 text-gray-500 focus:outline-none lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <a routerLink="/dashboard" class="flex items-center">
              <span class="text-xl font-bold text-blue-600">TMS</span>
              <span class="text-sm ml-2 text-gray-600 hidden sm:block">Sistema de Gestión de Neumáticos</span>
            </a>
          </div>

          <!-- Center section: Empresa Context Indicator (Desktop) -->
          <div class="hidden md:flex items-center" *ngIf="selectedEmpresa">
            <div class="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
              <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                {{ getEmpresaInitials(selectedEmpresa.nombre) }}
              </div>
              <span class="text-sm font-medium text-blue-800 max-w-32 truncate">{{ selectedEmpresa.nombre }}</span>
            </div>
          </div>
          
          <!-- Right section: User info and actions -->
          <div class="flex items-center">
            <div *ngIf="userName" class="flex items-center">
              <!-- User info -->
              <div class="hidden md:flex flex-col items-end mr-4">
                <span class="text-sm font-medium text-gray-700">{{ userName }}</span>
                <span class="text-xs text-gray-500">{{ userRole }}</span>
              </div>
              
              <!-- User dropdown -->
              <div class="relative">
                <button 
                  (click)="isUserMenuOpen = !isUserMenuOpen"
                  class="flex items-center justify-center p-1 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none transition-colors duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                
                <!-- Dropdown menu -->
                <div 
                  *ngIf="isUserMenuOpen"
                  class="origin-top-right absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabindex="-1"
                  (clickOutside)="isUserMenuOpen = false">
                  
                  <!-- User Info Header -->
                  <div class="px-4 py-3 bg-gray-50 rounded-t-lg border-b border-gray-200">
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {{ getUserInitials(userName) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{{ userName }}</p>
                        <p class="text-xs text-gray-500">{{ userRole }}</p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Current Empresa Section -->
                  <div class="px-4 py-3 border-b border-gray-200" *ngIf="selectedEmpresa">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {{ getEmpresaInitials(selectedEmpresa.nombre) }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{{ selectedEmpresa.nombre }}</p>
                        </div>
                      </div>
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actual
                      </span>
                    </div>
                    
                    <!-- Change Company Button -->
                    <button 
                      (click)="openEmpresaSelector()"
                      *ngIf="hasMultipleEmpresas"
                      class="mt-3 w-full flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                      </svg>
                      Cambiar Empresa
                    </button>
                  </div>
                  
                  <!-- Menu Options -->
                  <div class="py-1" role="none">
                    <a routerLink="/profile" 
                       (click)="isUserMenuOpen = false"
                       class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200" 
                       role="menuitem" tabindex="-1">
                      <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      Perfil
                    </a>
                    <a (click)="logout()" 
                       class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors duration-200" 
                       role="menuitem" tabindex="-1">
                      <svg class="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                      </svg>
                      Cerrar sesión
                    </a>
                  </div>
                </div>
              </div>
            </div>          </div>
        </div>
      </div>
    </header>

    <!-- Empresa Selector Modal -->
    <app-empresa-selector-modal
      *ngIf="isEmpresaSelectorOpen"
      [isOpen]="isEmpresaSelectorOpen"
      (closeModalEvent)="closeEmpresaSelector()"
      (empresaChanged)="onEmpresaChanged($event)">
    </app-empresa-selector-modal>
  `,
  styles: [`
    :host {
      display: block;
      z-index: 20;
      position: relative;
    }
    
    .clickOutside {
      display: none;
    }
  `]
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private empresaContextService = inject(EmpresaContextService);
  private router = inject(Router);

  @Output() sidebarToggle = new EventEmitter<void>();
  userName = '';
  userRole = '';
  isUserMenuOpen = false;
  isEmpresaSelectorOpen = false;
  selectedEmpresa: EmpresaInfo | null = null;
  hasMultipleEmpresas = false;

  ngOnInit(): void {
    // Subscribe to user session
    this.authService.userSession$.subscribe(
      session => {
        if (session) {
          this.userName = session.name || session.userName;
          this.userRole = session.role;
        }
      }
    );

    // Subscribe to empresa context
    this.empresaContextService.selectedEmpresa$.subscribe(
      empresa => {
        this.selectedEmpresa = empresa;
      }
    );

    // Check if user has multiple empresas
    this.hasMultipleEmpresas = this.empresaContextService.hasMultipleEmpresas();
  }

  /**
   * Generate initials for user name
   */
  getUserInitials(name: string): string {
    if (!name) return '??';

    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return words.slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
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
   * Open empresa selector modal
   */
  openEmpresaSelector(): void {
    this.isUserMenuOpen = false;
    this.isEmpresaSelectorOpen = true;
  }

  /**
   * Close empresa selector modal
   */
  closeEmpresaSelector(): void {
    this.isEmpresaSelectorOpen = false;
  }

  /**
   * Handle empresa change event from modal
   */
  onEmpresaChanged(empresa: EmpresaInfo): void {
    // La actualización ya se maneja en el modal
    // Aquí podríamos agregar lógica adicional si fuera necesario
    console.log('Empresa changed to:', empresa.nombre);
  }

  toggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  logout(): void {
    this.isUserMenuOpen = false;
    this.authService.logout();
  }
}
