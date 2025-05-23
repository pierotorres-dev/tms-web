import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    // Aquí irán componentes compartidos como botones personalizados, alertas, etc.
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  exports: [
    // Exportamos módulos comunes que se usarán en múltiples features
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    // Aquí también exportaremos los componentes declarados arriba
  ]
})
export class SharedModule { }