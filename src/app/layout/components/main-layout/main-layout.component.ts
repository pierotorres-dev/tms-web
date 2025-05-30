import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { BreadcrumbsComponent } from '../../../shared/components/breadcrumbs/breadcrumbs.component';
import { ToastContainerComponent } from '../../../shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent, BreadcrumbsComponent, ToastContainerComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
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
