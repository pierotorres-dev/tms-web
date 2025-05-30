import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';

@Component({
  selector: 'app-empresa-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empresa-indicator.component.html',
  styleUrl: './empresa-indicator.component.css'
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