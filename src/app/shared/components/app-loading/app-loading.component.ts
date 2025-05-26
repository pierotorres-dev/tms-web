import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 flex items-center justify-center">
      <div class="text-center">
        <!-- Logo container -->
        <div class="mb-8">
          <div class="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span class="text-white font-bold text-xl">TMS</span>
          </div>
        </div>
        
        <!-- Spinner más elegante -->
        <div class="relative">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 mx-auto mb-6"></div>
          <div class="absolute inset-0 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-blue-600 mx-auto mb-6"></div>
        </div>
        
        <!-- Texto de carga -->
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Iniciando aplicación</h2>
        <p class="text-sm text-gray-600">Por favor espere...</p>
        
        <!-- Barra de progreso animada -->
        <div class="mt-6 w-48 mx-auto">
          <div class="bg-gray-200 rounded-full h-1 overflow-hidden">
            <div class="bg-blue-600 h-1 rounded-full animate-pulse w-1/3"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    :host {
      animation: fadeIn 0.3s ease-out;
    }
  `]
})
export class AppLoadingComponent {
}
