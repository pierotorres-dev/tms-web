import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '../../../../shared/shared.module';
import { AuthService } from '../../services/auth.service';
import { TOKEN_STORAGE } from '../../constants/auth.constants';
import { EmpresaInfo } from '../../models/auth.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-select-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SharedModule],
  templateUrl: './select-empresa.component.html',
  styleUrl: './select-empresa.component.css'
})
export class SelectEmpresaComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  loading = true;
  error = '';
  empresas: EmpresaInfo[] = [];
  userId = 0;
  sessionToken = '';
  isReturningUser = false;  ngOnInit(): void {
    // Check if this is a returning user (someone who already had a session)
    this.isReturningUser = this.router.url.includes('returnUrl') || 
                          localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN) !== null;

    // Recuperar información del usuario y empresas del localStorage
    const userData = localStorage.getItem(TOKEN_STORAGE.USER_DATA);
    const empresasData = localStorage.getItem(TOKEN_STORAGE.EMPRESAS_LIST);
    this.sessionToken = localStorage.getItem(TOKEN_STORAGE.SESSION_TOKEN) || '';

    if (userData && empresasData && this.sessionToken) {
      try {
        const parsedData = JSON.parse(userData);
        const parsedEmpresas = JSON.parse(empresasData);

        this.userId = parsedData.userId;
        this.empresas = parsedEmpresas;

        if (this.isReturningUser) {
          this.notificationService.info('Selecciona la empresa con la que deseas trabajar');
        }

        this.loading = false;
      } catch (error) {
        this.error = 'Error al cargar los datos del usuario';
        this.loading = false;
      }
    } else {
      // Si no hay datos de usuario, empresas o token de sesión, redirigir al login
      this.router.navigate(['/auth/login']);
    }
  }  selectEmpresa(empresaId: number): void {
    this.loading = true;
    this.error = '';

    // Encontrar la empresa seleccionada para almacenar su información completa
    const empresaSeleccionada = this.empresas.find(emp => emp.id === empresaId);

    if (empresaSeleccionada) {
      // Almacenar la empresa seleccionada para uso futuro
      localStorage.setItem(TOKEN_STORAGE.SELECTED_EMPRESA, JSON.stringify(empresaSeleccionada));
      
      // Show loading notification
      if (this.isReturningUser) {
        this.notificationService.info(`Cambiando a empresa: ${empresaSeleccionada.nombre}...`);
      } else {
        this.notificationService.info(`Accediendo como: ${empresaSeleccionada.nombre}...`);
      }
    }

    // Llamar al servicio para generar un nuevo token con la empresa seleccionada
    this.authService.generateToken(this.userId, empresaId, this.sessionToken)
      .subscribe({
        next: () => {
          // Show success notification
          if (empresaSeleccionada) {
            if (this.isReturningUser) {
              this.notificationService.success(`Empresa cambiada exitosamente a: ${empresaSeleccionada.nombre}`);
            } else {
              this.notificationService.success(`Bienvenido a ${empresaSeleccionada.nombre}`);
            }
          }
          // La redirección al dashboard ya está manejada en el servicio
        },
        error: (error: any) => {
          if (error.status === 401) {
            this.error = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
            this.notificationService.error('Sesión expirada. Redirigiendo al login...');
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 2000);
          } else {
            this.error = 'Error al seleccionar la empresa. Por favor, inténtelo de nuevo.';
            this.notificationService.error('Error al cambiar de empresa. Inténtalo de nuevo.');
          }
          this.loading = false;
        }
      });
  }

  /**
   * Función trackBy para optimizar el rendimiento del *ngFor
   */
  trackByEmpresaId(index: number, empresa: EmpresaInfo): number {
    return empresa.id;
  }

  /**
   * Obtiene las iniciales del nombre de la empresa para el avatar
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

  logout(): void {
    // Limpiar datos de empresas antes de hacer logout
    localStorage.removeItem(TOKEN_STORAGE.EMPRESAS_LIST);
    localStorage.removeItem(TOKEN_STORAGE.SELECTED_EMPRESA);
    this.authService.logout();
  }
}
