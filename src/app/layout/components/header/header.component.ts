import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';
import { EmpresaSelectorModalComponent } from '../../../shared/components/empresa-selector-modal/empresa-selector-modal.component';
import { ConnectionStatusComponent } from '../../../shared/components/connection-status/connection-status.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, ClickOutsideDirective, EmpresaSelectorModalComponent, ConnectionStatusComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private empresaContextService = inject(EmpresaContextService);
  private router = inject(Router);
  @Output() sidebarToggle = new EventEmitter<void>();
  userName = '';
  userRole = '';
  fullName = '';
  displayName = '';
  isUserMenuOpen = false;
  isEmpresaSelectorOpen = false;
  selectedEmpresa: EmpresaInfo | null = null;
  hasMultipleEmpresas = false;

  ngOnInit(): void {    // Subscribe to user session
    this.authService.userSession$.subscribe(
      session => {
        if (session) {
          this.userName = session.name || session.userName;
          this.userRole = session.role;
          this.fullName = this.buildFullName(session.name, session.lastName);
          this.displayName = this.buildDisplayName(session.name, session.lastName);
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
   * Build full name from name and lastName
   */
  buildFullName(name: string, lastName: string): string {
    const firstName = name ? name.trim().split(' ')[0] : '';
    const lastNameFirst = lastName ? lastName.trim().split(' ')[0] : '';
    
    if (firstName && lastNameFirst) {
      return `${firstName} ${lastNameFirst}`;
    } else if (firstName) {
      return firstName;
    } else if (lastNameFirst) {
      return lastNameFirst;
    }
    
    return '';
  }

  /**
   * Build display name for compact view (initials based)
   */
  buildDisplayName(name: string, lastName: string): string {
    const firstName = name ? name.trim().split(' ')[0] : '';
    const lastNameFirst = lastName ? lastName.trim().split(' ')[0] : '';
    
    if (firstName && lastNameFirst) {
      return `${firstName.charAt(0)}${lastNameFirst.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    } else if (lastNameFirst) {
      return lastNameFirst.substring(0, 2).toUpperCase();
    }
    
    return '??';
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