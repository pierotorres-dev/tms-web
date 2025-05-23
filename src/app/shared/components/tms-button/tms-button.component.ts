import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tms-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tms-button.component.html',
  styleUrl: './tms-button.component.css'
})
export class TmsButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() variant: 'primary' | 'secondary' | 'accent' | 'outline' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullWidth = false;
  @Output() buttonClick = new EventEmitter<Event>();
  get classes(): string {
    const baseClasses = 'group relative flex justify-center items-center border font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out';

    // Size classes
    const sizeClasses = {
      'sm': 'py-1.5 px-3 text-xs',
      'md': 'py-2.5 px-4 text-sm',
      'lg': 'py-3 px-6 text-base'
    }[this.size];    // Variant classes con clases CSS personalizadas para colores TMS
    const variantClasses = {
      'primary': 'text-white btn-tms-primary hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed',
      'secondary': 'text-white btn-tms-secondary hover:bg-gray-700 hover:border-gray-700 focus:ring-gray-500 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed',
      'accent': 'text-white btn-tms-accent hover:bg-red-700 hover:border-red-700 focus:ring-red-500 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed',
      'outline': 'text-blue-600 bg-white border-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed'
    }[this.variant];

    // Width class
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