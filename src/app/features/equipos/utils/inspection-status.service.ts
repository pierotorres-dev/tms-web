import { Injectable } from '@angular/core';

/**
 * Tipos para el estado de inspección
 */
export type InspectionStatus = 'critical' | 'warning' | 'good';

/**
 * Interfaz para el resultado del estado de inspección
 */
export interface InspectionStatusResult {
  status: InspectionStatus;
  daysDifference: number;
  message: string;
  colorClass: string;
  bgColorClass: string;
  isOverdue: boolean;
}

/**
 * Configuración para los umbrales de inspección
 */
export interface InspectionThresholds {
  criticalDays: number;
  warningDays: number;
}

/**
 * Servicio para calcular el estado de inspección de equipos
 * Implementa la lógica de negocio para determinar el estado visual
 * basado en la fecha de la última inspección
 */
@Injectable({
  providedIn: 'root'
})
export class InspectionStatusService {  
  private readonly DEFAULT_THRESHOLDS: InspectionThresholds = {
    criticalDays: 30,
    warningDays: 20
  };

  /**
   * Calcula el estado de inspección basado en la fecha
   * @param fechaInspeccion - Fecha de la última inspección
   * @param currentDate - Fecha actual (opcional, por defecto es hoy)
   * @param thresholds - Umbrales personalizados (opcional)
   * @returns Resultado con estado, días de diferencia y metadatos
   */
  calculateInspectionStatus(
    fechaInspeccion: Date | string | null | undefined,
    currentDate: Date = new Date(),
    thresholds: InspectionThresholds = this.DEFAULT_THRESHOLDS
  ): InspectionStatusResult {
    
    // Caso 1: Fecha nula, vacía o no válida
    if (!fechaInspeccion) {
      return {
        status: 'critical',
        daysDifference: -1,
        message: 'Sin fecha de inspección registrada',
        colorClass: 'text-red-600',
        bgColorClass: 'bg-red-500',
        isOverdue: true
      };
    }

    // Convertir fecha a objeto Date si es string
    const inspectionDate = new Date(fechaInspeccion);
    
    // Validar que la fecha sea válida
    if (isNaN(inspectionDate.getTime())) {
      return {
        status: 'critical',
        daysDifference: -1,
        message: 'Fecha de inspección inválida',
        colorClass: 'text-red-600',
        bgColorClass: 'bg-red-500',
        isOverdue: true
      };
    }

    // Calcular diferencia en días
    const timeDifference = currentDate.getTime() - inspectionDate.getTime();
    const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

    // Determinar estado basado en umbrales
    if (daysDifference >= thresholds.criticalDays) {
      return {
        status: 'critical',
        daysDifference,
        message: `Inspección vencida hace ${daysDifference} días`,
        colorClass: 'text-red-600',
        bgColorClass: 'bg-red-500',
        isOverdue: true
      };
    }

    if (daysDifference >= thresholds.warningDays) {
      return {
        status: 'warning',
        daysDifference,
        message: `Inspección próxima a vencer (${daysDifference} días)`,
        colorClass: 'text-orange-600',
        bgColorClass: 'bg-orange-500',
        isOverdue: false
      };
    }

    // Estado bueno (menos de 20 días)
    return {
      status: 'good',
      daysDifference,
      message: daysDifference === 0 
        ? 'Inspección realizada hoy' 
        : `Inspección al día (${daysDifference} días)`,
      colorClass: 'text-green-600',
      bgColorClass: 'bg-green-500',
      isOverdue: false
    };
  }
  /**
   * Obtiene solo el color del círculo indicador
   * @param fechaInspeccion - Fecha de la última inspección
   * @param currentDate - Fecha actual (opcional)
   * @param thresholds - Umbrales personalizados (opcional)
   * @returns Clase CSS para el color de fondo del círculo
   */
  getInspectionIndicatorColor(
    fechaInspeccion: Date | string | null | undefined,
    currentDate?: Date,
    thresholds?: InspectionThresholds
  ): string {
    const result = this.calculateInspectionStatus(fechaInspeccion, currentDate, thresholds);
    return result.bgColorClass;
  }

  /**
   * Verifica si una inspección está vencida
   * @param fechaInspeccion - Fecha de la última inspección
   * @param currentDate - Fecha actual (opcional)
   * @param thresholds - Umbrales personalizados (opcional)
   * @returns true si la inspección está vencida
   */
  isInspectionOverdue(
    fechaInspeccion: Date | string | null | undefined,
    currentDate?: Date,
    thresholds?: InspectionThresholds
  ): boolean {
    const result = this.calculateInspectionStatus(fechaInspeccion, currentDate, thresholds);
    return result.isOverdue;
  }
  /**
   * Obtiene un resumen de estados para un array de equipos
   * @param equipos - Array de equipos con fechas de inspección
   * @param currentDate - Fecha actual (opcional)
   * @param thresholds - Umbrales personalizados (opcional)
   * @returns Resumen con contadores por estado
   */
  getInspectionsSummary(
    equipos: { fechaInspeccion: Date | string | null | undefined }[],
    currentDate?: Date,
    thresholds?: InspectionThresholds
  ): { critical: number; warning: number; good: number; total: number } {
    const summary = { critical: 0, warning: 0, good: 0, total: equipos.length };
    
    equipos.forEach(equipo => {
      const result = this.calculateInspectionStatus(equipo.fechaInspeccion, currentDate, thresholds);
      summary[result.status]++;
    });

    return summary;
  }

  /**
   * Obtiene un resumen de estados excluyendo equipos con estado "Indisponible" e "Inactivo"
   * @param equipos - Array de equipos con fechas de inspección y estado
   * @param currentDate - Fecha actual (opcional)
   * @param thresholds - Umbrales personalizados (opcional)
   * @returns Resumen con contadores por estado excluyendo equipos con estados específicos
   */
  getInspectionsSummaryForCounts(
    equipos: { 
      fechaInspeccion: Date | string | null | undefined;
      estadoEquipoResponse?: { id: number; nombre: string; descripcion?: string; };
    }[],
    currentDate?: Date,
    thresholds?: InspectionThresholds
  ): { critical: number; warning: number; good: number; total: number } {
    // Filtrar equipos excluyendo los que tienen estado "Indisponible" o "Inactivo"
    const equiposParaConteo = equipos.filter(equipo => {
      if (!equipo.estadoEquipoResponse?.nombre) {
        return true; // Incluir equipos sin estado definido
      }

      const estadoNombre = equipo.estadoEquipoResponse.nombre.toLowerCase().trim();
      return estadoNombre !== 'indisponible' && estadoNombre !== 'inactivo';
    });

    const summary = { critical: 0, warning: 0, good: 0, total: equiposParaConteo.length };
    
    equiposParaConteo.forEach(equipo => {
      const result = this.calculateInspectionStatus(equipo.fechaInspeccion, currentDate, thresholds);
      summary[result.status]++;
    });

    return summary;
  }
}
