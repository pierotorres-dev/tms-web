import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="bg-white shadow-md mt-auto py-4">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-600">
            &copy; {{ currentYear }} TMS - Todos los derechos reservados
          </div>
          <div class="text-sm text-gray-500">
            Powered by Dlirio Tyre
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
