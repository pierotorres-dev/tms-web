import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside 
      class="bg-gray-800 text-white w-64 fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out z-10"
      [ngClass]="{'translate-x-0': isOpen, '-translate-x-full': !isOpen}"
    >
      <!-- Sidebar header -->
      <div class="h-16 flex items-center justify-between px-4 bg-gray-900">
        <h2 class="text-xl font-bold">TMS</h2>
        <button 
          (click)="isOpen = false"
          class="p-1 text-gray-400 focus:outline-none lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Navigation -->
      <nav class="mt-5 px-2">
        <a 
          routerLink="/dashboard" 
          routerLinkActive="bg-gray-900 text-white"
          [routerLinkActiveOptions]="{exact: true}"
          class="group flex items-center px-2 py-2 text-base font-medium rounded-md hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-4 h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </a>
        
        <a 
          routerLink="/neumaticos" 
          routerLinkActive="bg-gray-900 text-white"
          class="mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-4 h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Neumáticos
        </a>
        
        <a 
          routerLink="/inspecciones" 
          routerLinkActive="bg-gray-900 text-white"
          class="mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-4 h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Inspecciones
        </a>
        
        <a 
          routerLink="/equipos" 
          routerLinkActive="bg-gray-900 text-white"
          class="mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-4 h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Equipos
        </a>
      </nav>
      
      <!-- Bottom section -->
      <div class="absolute bottom-0 w-full px-4 py-4 bg-gray-900">
        <div class="flex items-center">
          <!-- System version -->
          <div class="text-xs text-gray-400">
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
    
    <!-- Overlay for mobile -->
    <div 
      *ngIf="isOpen" 
      (click)="isOpen = false"
      class="fixed inset-0 bg-gray-600 bg-opacity-75 z-0 lg:hidden"
    ></div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    @media (min-width: 1024px) {
      aside {
        transform: translateX(0) !important;
      }
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = true;
}
