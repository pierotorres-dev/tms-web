import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EquipoListComponent } from './pages/equipo-list/equipo-list.component';
import { EquipoFormComponent } from './components/equipo-form/equipo-form.component';

// Services
import { FleetService } from './services/fleet.service';
import { EquiposService } from './services/equipos.service';
import { ObservacionesService } from './services/observaciones.service';

// Guards
import { EmpresaSelectedGuard } from '../../core/guards/empresa-selected.guard';

const routes: Routes = [
  {
    path: '',
    component: EquipoListComponent,
    canActivate: [EmpresaSelectedGuard]
  },
  {
    path: 'nuevo',
    component: EquipoFormComponent,
    canActivate: [EmpresaSelectedGuard]
  },
  {
    path: 'editar/:id',
    component: EquipoFormComponent,
    canActivate: [EmpresaSelectedGuard]
  },
  {
    path: 'detalle/:id',
    component: EquipoFormComponent,
    canActivate: [EmpresaSelectedGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  declarations: [],  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    // Import standalone components
    EquipoListComponent,
    EquipoFormComponent
  ],
  providers: [
    // Services are provided automatically with 'providedIn: root'
    // but we include them here for explicit control and documentation
    FleetService,
    EquiposService,
    ObservacionesService
  ]
})
export class EquiposModule { }