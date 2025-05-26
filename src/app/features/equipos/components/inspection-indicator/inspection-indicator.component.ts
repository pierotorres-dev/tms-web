import { Component, Input, OnInit, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectionStatusService, InspectionStatusResult, InspectionThresholds } from '../../utils/inspection-status.service';

/**
 * Componente para mostrar el estado visual de inspección de equipos
 * Muestra un círculo de color con tooltip informativo
 * 
 * @example
 * <app-inspection-indicator 
 *   [fechaInspeccion]="equipo.fechaInspeccion"
 *   [showTooltip]="true"
 *   size="sm">
 * </app-inspection-indicator>
 */
@Component({
  selector: 'app-inspection-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inspection-indicator-container" [class]="containerClass">
      <!-- Círculo indicador -->
      <div 
        class="inspection-circle"
        [class]="circleClasses"
        [title]="showTooltip ? statusResult.message : ''"
        [attr.aria-label]="'Estado de inspección: ' + statusResult.message">
        
        <!-- Icono opcional para estado crítico -->
        <svg 
          *ngIf="showIcon && statusResult.status === 'critical'" 
          class="inspection-icon"
          fill="currentColor" 
          viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>

        <!-- Punto interno para estados no críticos -->
        <div 
          *ngIf="!showIcon || statusResult.status !== 'critical'"
          class="inspection-dot">
        </div>
      </div>

      <!-- Tooltip personalizado (opcional) -->
      <div 
        *ngIf="showCustomTooltip" 
        class="inspection-tooltip"
        [class.show]="showTooltipContent">
        <div class="tooltip-content">
          <div class="tooltip-title">Estado de Inspección</div>
          <div class="tooltip-message">{{ statusResult.message }}</div>
          <div *ngIf="statusResult.daysDifference >= 0" class="tooltip-days">
            {{ statusResult.daysDifference }} días desde la última inspección
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./inspection-indicator.component.css']
})
export class InspectionIndicatorComponent implements OnInit, OnChanges {
  
  private readonly inspectionStatusService = inject(InspectionStatusService);

  /**
   * Fecha de inspección del equipo
   */
  @Input() fechaInspeccion: Date | string | null | undefined;

  /**
   * Tamaño del indicador
   */
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';

  /**
   * Mostrar tooltip nativo del navegador
   */
  @Input() showTooltip: boolean = true;

  /**
   * Mostrar tooltip personalizado
   */
  @Input() showCustomTooltip: boolean = false;

  /**
   * Mostrar icono en estado crítico
   */
  @Input() showIcon: boolean = false;

  /**
   * Umbrales personalizados para los estados
   */
  @Input() thresholds?: InspectionThresholds;

  /**
   * Fecha actual personalizada (útil para testing)
   */
  @Input() currentDate?: Date;

  /**
   * Clases CSS adicionales para el contenedor
   */
  @Input() customClass: string = '';

  // Estado interno
  statusResult!: InspectionStatusResult;
  showTooltipContent: boolean = false;

  ngOnInit(): void {
    this.updateStatus();
  }

  ngOnChanges(): void {
    this.updateStatus();
  }
  /**
   * Actualiza el estado de inspección
   */
  private updateStatus(): void {
    this.statusResult = this.inspectionStatusService.calculateInspectionStatus(
      this.fechaInspeccion,
      this.currentDate,
      this.thresholds
    );
  }

  /**
   * Obtiene las clases CSS para el contenedor
   */
  get containerClass(): string {
    const classes = ['inspection-container'];
    if (this.customClass) {
      classes.push(this.customClass);
    }
    return classes.join(' ');
  }

  /**
   * Obtiene las clases CSS para el círculo
   */
  get circleClasses(): string {
    const baseClasses = [
      'rounded-full',
      'border-2',
      'border-white',
      'shadow-sm',
      'flex',
      'items-center',
      'justify-center',
      'transition-all',
      'duration-200',
      'hover:scale-110'
    ];

    // Tamaño
    const sizeClasses = {
      'xs': ['w-2', 'h-2'],
      'sm': ['w-3', 'h-3'],
      'md': ['w-4', 'h-4'],
      'lg': ['w-6', 'h-6']
    };

    // Color de fondo basado en estado
    baseClasses.push(this.statusResult.bgColorClass);
    baseClasses.push(...sizeClasses[this.size]);

    return baseClasses.join(' ');
  }

  /**
   * Maneja el hover para tooltip personalizado
   */
  onMouseEnter(): void {
    if (this.showCustomTooltip) {
      this.showTooltipContent = true;
    }
  }

  /**
   * Maneja el salir del hover para tooltip personalizado
   */
  onMouseLeave(): void {
    if (this.showCustomTooltip) {
      this.showTooltipContent = false;
    }
  }
}
