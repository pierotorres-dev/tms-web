import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '../../../../shared/shared.module';
import { AuthService } from '../../services/auth.service';
import { TOKEN_STORAGE } from '../../constants/auth.constants';

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

  loading = true;
  error = '';
  empresas: {id: number}[] = [];
  userId = 0;
  sessionToken = '';
  
  ngOnInit(): void {
    // Recuperar información del usuario y empresas del localStorage
    const userData = localStorage.getItem(TOKEN_STORAGE.USER_DATA);
    this.sessionToken = localStorage.getItem(TOKEN_STORAGE.SESSION_TOKEN) || '';
    
    if (userData && this.sessionToken) {
      try {
        const parsedData = JSON.parse(userData);
        this.userId = parsedData.userId;
        
        // Aquí deberíamos cargar las empresas desde el localStorage o hacer otra llamada API
        // Por ahora simulamos datos de empresa hardcoded
        // En una implementación real, esta información vendría de la respuesta del login
        this.empresas = [
          { id: 1 },
          { id: 2 }
        ];
        
        this.loading = false;
      } catch (error) {
        this.error = 'Error al cargar los datos del usuario';
        this.loading = false;
      }
    } else {
      // Si no hay datos de usuario o token de sesión, redirigir al login
      this.router.navigate(['/auth/login']);
    }
  }
  
  selectEmpresa(empresaId: number): void {
    this.loading = true;
    
    // Llamar al servicio para generar un nuevo token con la empresa seleccionada
    this.authService.generateToken(this.userId, empresaId, this.sessionToken)
      .subscribe({
        next: () => {
          // La redirección al dashboard ya está manejada en el servicio
        },
        error: (error: any) => {
          if (error.status === 401) {
            this.error = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
          } else {
            this.error = 'Error al seleccionar la empresa. Por favor, inténtelo de nuevo.';
          }
          this.loading = false;
        }
      });
  }
  
  logout(): void {
    this.authService.logout();
  }
}
