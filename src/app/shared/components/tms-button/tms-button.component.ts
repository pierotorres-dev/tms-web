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
    const baseClasses = 'group relative flex justify-center items-center border border-transparent font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    // Size classes
    const sizeClasses = {
      'sm': 'py-1 px-3 text-xs',
      'md': 'py-2 px-4 text-sm',
      'lg': 'py-3 px-6 text-base'
    }[this.size];
    
    // Variant classes
    const variantClasses = {
      'primary': 'text-white bg-tms-primary hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
      'secondary': 'text-white bg-tms-secondary hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300',
      'accent': 'text-white bg-tms-accent hover:bg-red-600 focus:ring-red-500 disabled:bg-red-300',
      'outline': 'text-tms-primary bg-white border-tms-primary hover:bg-gray-50 focus:ring-blue-500 disabled:text-gray-400 disabled:border-gray-300'
    }[this.variant];
    
    // Width class
    const widthClass = this.fullWidth ? 'w-full' : '';
    
    return `${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass}`;
  }

  onClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.buttonClick.emit(event);
    }
  }
}
