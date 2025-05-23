import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SharedModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl = '/dashboard';

  ngOnInit(): void {
    // Crear formulario de login
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });

    // Obtener URL de retorno de los query params o usar default
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Limpiar cualquier mensaje de error previo
    this.error = '';
  }

  // Getter para acceso fácil a los campos del form
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    // Detener si el formulario es inválido
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;

    const loginRequest: LoginRequest = {      userName: this.f['userName'].value,
      password: this.f['password'].value
    };    this.authService.login(loginRequest)
      .subscribe({
        next: (response: any) => {
          // Verificar si el usuario tiene múltiples empresas o debe seleccionar una
          if (response.empresas && response.empresas.length > 1) {
            this.router.navigate(['/auth/select-empresa']);
          } else {
            // Redirigir a la página solicitada o dashboard
            this.router.navigate([this.returnUrl]);
          }
        },
        error: (error: any) => {
          // Manejar diferentes tipos de errores
          if (error.status === 401) {
            this.error = 'Usuario o contraseña incorrectos';
          } else if (error.status === 429) {
            this.error = 'Demasiados intentos fallidos. Por favor, intente más tarde.';
          } else {
            this.error = 'Error al iniciar sesión. Por favor, inténtelo de nuevo.';
          }
          this.loading = false;
        }
      });
  }
}
