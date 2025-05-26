import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from './features/auth/services/auth.service';
import { AppLoadingComponent } from './shared/components/app-loading/app-loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AppLoadingComponent],
  template: `
    <!-- Mostrar loading mientras la app se inicializa -->
    <app-loading *ngIf="!(isInitialized$ | async)"></app-loading>
    
    <!-- Componente de notificaciones -->
    <!-- <app-notification></app-notification>-->
    
    <!-- Contenido principal -->
    <router-outlet *ngIf="isInitialized$ | async"></router-outlet>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'TMS - Sistema de Gestión de Neumáticos';
  
  private authService = inject(AuthService);
  isInitialized$!: Observable<boolean>;
  
  ngOnInit(): void {
    this.isInitialized$ = this.authService.isInitialized$;
  }
}
