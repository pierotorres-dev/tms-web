import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { EmpresaSelectedGuard } from '../../core/guards/empresa-selected.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'lista',
    pathMatch: 'full'
  },
  // Aquí irán las rutas para los componentes de inspecciones
  // Todas las rutas futuras deberán incluir canActivate: [EmpresaSelectedGuard]
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class InspeccionesModule { }
