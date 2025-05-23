import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, ClickOutsideDirective],
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
                  class="flex items-center justify-center p-1 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                
                <!-- Dropdown menu -->
                <div 
                  *ngIf="isUserMenuOpen"
                  class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabindex="-1"
                  (clickOutside)="isUserMenuOpen = false">
                  <div class="py-1" role="none">
                    <a routerLink="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">
                      Perfil
                    </a>
                    <a (click)="logout()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer" role="menuitem" tabindex="-1">
                      Cerrar sesión
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
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
export class HeaderComponent {
  private authService = inject(AuthService);

  @Output() sidebarToggle = new EventEmitter<void>();

  userName = '';
  userRole = '';
  isUserMenuOpen = false;

  ngOnInit(): void {
    this.authService.userSession$.subscribe(
      session => {
        if (session) {
          this.userName = session.name || session.userName;
          this.userRole = session.role;
        }
      }
    );
  }

  toggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  logout(): void {
    this.isUserMenuOpen = false;
    this.authService.logout();
  }
}
