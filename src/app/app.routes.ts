import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { nonAuthGuard } from './core/guards/non-auth.guard';
import { MainLayoutComponent } from './layout/components/main-layout/main-layout.component';

export const routes: Routes = [
  // Rutas públicas (no autenticadas)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule),
    canActivate: [nonAuthGuard]
  },
  
  // Rutas protegidas (con layout principal)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'neumaticos',
        loadChildren: () => import('./features/neumaticos/neumaticos.module').then(m => m.NeumaticosModule)
      },
      {
        path: 'inspecciones',
        loadChildren: () => import('./features/inspecciones/inspecciones.module').then(m => m.InspeccionesModule)
      },
      {
        path: 'equipos',
        loadChildren: () => import('./features/equipos/equipos.module').then(m => m.EquiposModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  
  // Ruta para manejo de errores 404
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
