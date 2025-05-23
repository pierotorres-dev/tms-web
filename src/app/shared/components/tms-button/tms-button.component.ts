import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tms-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tms-button.component.html',
  styleUrl: './tms-button.component.css',
  host: {
    '[class.full-width]': 'fullWidth'
  }
})
export class TmsButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() variant: 'primary' | 'secondary' | 'accent' | 'outline' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullWidth = false;
  @Output() buttonClick = new EventEmitter<Event>();  get classes(): string {
    const baseClasses = 'group relative flex justify-center items-center border font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out';

    // Size classes
    const sizeClasses = {
      'sm': 'py-1.5 px-3 text-xs',
      'md': 'py-2.5 px-4 text-sm',
      'lg': 'py-3 px-6 text-base'
    }[this.size];

    // Variant classes usando las nuevas clases de Tailwind v4
    const variantClasses = {
      'primary': 'text-white bg-tms-primary border-tms-primary hover:bg-tms-primary-hover hover:border-tms-primary-hover focus:ring-tms-primary-ring disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed shadow-button',
      'secondary': 'text-white bg-tms-secondary border-tms-secondary hover:bg-tms-secondary-hover hover:border-tms-secondary-hover focus:ring-gray-500 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed shadow-button',
      'accent': 'text-white bg-tms-accent border-tms-accent hover:bg-tms-accent-hover hover:border-tms-accent-hover focus:ring-red-500 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed shadow-button',
      'outline': 'text-tms-primary bg-white border-tms-primary hover:bg-tms-primary hover:text-white focus:ring-tms-primary-ring disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed'
    }[this.variant];

    // Width class - asegurar que w-full se aplique correctamente
    const widthClass = this.fullWidth ? 'w-full' : '';

    // Loading state classes
    const loadingClasses = this.loading ? 'cursor-wait' : '';

    return `${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${loadingClasses}`.trim();
  }

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.buttonClick.emit(event);
    }
  }
}