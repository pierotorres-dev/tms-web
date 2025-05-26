import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http'; // Import withFetch
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { CoreModule } from './core/core.module';
import { AuthService } from './features/auth/services/auth.service';

// Factory function for APP_INITIALIZER
export function initializeApp(authService: AuthService) {
  return () => authService.performInitialSessionCheck();
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Configuración principal de Angular
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes, withComponentInputBinding()), 
    provideClientHydration(withEventReplay()),
    
    // Configuración HTTP y seguridad
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withFetch() // Add withFetch here
    ),
    
    // Módulos principales
    importProvidersFrom(CoreModule),
    
    // APP_INITIALIZER to check session before app loads
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
};
