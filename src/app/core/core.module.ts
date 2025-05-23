import { NgModule, Optional, SkipSelf, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { authInterceptor } from './interceptors/auth.interceptor';

/**
 * Módulo Core que proporciona servicios singleton y funcionalidades a nivel
 * de aplicación que se usan en toda la aplicación
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule
  ],
  providers: [
    // Proveemos el interceptor HTTP para autenticación
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
})
export class CoreModule {
  /**
   * Garantiza que el CoreModule solo se importe en el AppModule
   */
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule ya está cargado. Importarlo solo en AppModule');
    }
  }
}
