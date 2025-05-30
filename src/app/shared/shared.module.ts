import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { EmpresaIndicatorComponent } from './components/empresa-indicator/empresa-indicator.component';
import { ConnectionStatusComponent } from './components/connection-status/connection-status.component';

@NgModule({
  declarations: [
    // Aquí irán componentes compartidos como botones personalizados, alertas, etc.
  ],  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    BreadcrumbsComponent,
    ToastContainerComponent,
    EmpresaIndicatorComponent,
    ConnectionStatusComponent
  ],
  exports: [
    // Exportamos módulos comunes que se usarán en múltiples features
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    BreadcrumbsComponent,
    ToastContainerComponent,
    EmpresaIndicatorComponent,
    ConnectionStatusComponent
    // Aquí también exportaremos los componentes declarados arriba
  ]
})
export class SharedModule { }