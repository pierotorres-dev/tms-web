import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard.component';
import { EmpresaSelectedGuard } from '../../core/guards/empresa-selected.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    canActivate: [EmpresaSelectedGuard]
  }
];

@NgModule({
  declarations: [
    // Componentes específicos del dashboard
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class DashboardModule { }
