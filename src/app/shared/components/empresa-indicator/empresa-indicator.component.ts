import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';

@Component({
  selector: 'app-empresa-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      *ngIf="selectedEmpresa && showIndicator"
      class="empresa-indicator"
      [ngClass]="{
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium': size === 'sm',
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium': size === 'md',
        'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium': size === 'lg'
      }"
      [class]="getIndicatorClasses()">
      
      <!-- Company Avatar -->
      <div 
        class="rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-blue-500 to-blue-600"
        [ngClass]="{
          'w-4 h-4 text-xs mr-1.5': size === 'sm',
          'w-5 h-5 text-xs mr-2': size === 'md',
          'w-6 h-6 text-sm mr-2': size === 'lg'
        }">
        {{ getEmpresaInitials(selectedEmpresa.nombre) }}
      </div>
      
      <!-- Company Name -->
      <span class="text-gray-800 truncate" [class.max-w-24]="size === 'sm'" [class.max-w-32]="size === 'md'">
        {{ selectedEmpresa.nombre }}
      </span>
      
      <!-- Company ID (optional) -->
      <span 
        *ngIf="showId && size !== 'sm'" 
        class="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
        {{ selectedEmpresa.id }}
      </span>
    </div>
  `,
  styles: [`
    .empresa-indicator {
      transition: all 0.2s ease-in-out;
    }
    
    .empresa-indicator:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class EmpresaIndicatorComponent implements OnInit {
  private empresaContextService = inject(EmpresaContextService);

  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'default' | 'subtle' | 'prominent' = 'default';
  @Input() showId = false;
  @Input() showIndicator = true;

  selectedEmpresa: EmpresaInfo | null = null;

  ngOnInit(): void {
    this.empresaContextService.selectedEmpresa$.subscribe(
      empresa => {
        this.selectedEmpresa = empresa;
      }
    );
  }

  /**
   * Generate initials for empresa name
   */
  getEmpresaInitials(nombre: string): string {
    if (!nombre) return '??';

    const words = nombre.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return words.slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  /**
   * Get CSS classes based on variant
   */
  getIndicatorClasses(): string {
    const baseClasses = '';
    
    switch (this.variant) {
      case 'subtle':
        return baseClasses + ' bg-gray-100 border border-gray-200';
      case 'prominent':
        return baseClasses + ' bg-blue-50 border border-blue-200';
      default:
        return baseClasses + ' bg-white border border-gray-300 shadow-sm';
    }
  }
}
