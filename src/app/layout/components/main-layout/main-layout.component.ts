import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent],
  template: `
    <div class="flex h-screen bg-gray-100">
      <!-- Sidebar -->
      <app-sidebar [isOpen]="sidebarOpen"></app-sidebar>
      
      <!-- Main content -->
      <div class="flex-1 flex flex-col overflow-hidden lg:pl-64">
        <!-- Header -->
        <app-header (sidebarToggle)="toggleSidebar()"></app-header>
        
        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <router-outlet></router-outlet>
        </main>
        
        <!-- Footer -->
        <app-footer></app-footer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class MainLayoutComponent {
  sidebarOpen = false;
  
  constructor() {
    // En versión móvil el sidebar está cerrado por defecto
    // En versión desktop el sidebar está abierto por defecto (gestionado por CSS)
    this.sidebarOpen = window.innerWidth >= 1024;
  }
  
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
