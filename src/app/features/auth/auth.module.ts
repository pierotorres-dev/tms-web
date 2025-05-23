import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Importamos los componentes de autenticación
import { LoginComponent } from './pages/login/login.component';
import { SelectEmpresaComponent } from './pages/select-empresa/select-empresa.component';

/**
 * Rutas para el módulo de autenticación
 */
const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'login',
    pathMatch: 'full'
  },
  { 
    path: 'login', 
    component: LoginComponent
  },
  {
    path: 'select-empresa',
    component: SelectEmpresaComponent
  }
  // Podemos añadir más rutas en el futuro como register o forgot-password
];

/**
 * Módulo que agrupa toda la funcionalidad de autenticación
 */
@NgModule({  declarations: [
    // Standalone components don't need to be declared
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes),
    LoginComponent,
    SelectEmpresaComponent
  ]
})
export class AuthModule { }
