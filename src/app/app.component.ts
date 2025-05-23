import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
//import { NotificationComponent } from './shared/components/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <!-- Componente de notificaciones -->
    <!-- <app-notification></app-notification>-->
    
    <!-- Contenido principal -->
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'TMS - Sistema de Gestión de Neumáticos';
}
