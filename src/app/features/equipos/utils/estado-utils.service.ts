import { Injectable } from '@angular/core';
import { EstadoEquipoResponse } from '../models/fleet.dto';

/**
 * Configuración de estilos y comportamiento para estados de equipos
 */
interface EstadoConfig {
  cssClass: string;
  icon?: string;
  priority: number;
  description?: string;
}

/**
 * Servicio utilitario para manejo de estados de equipos
 * Proporciona mapeo dinámico y flexible sin depender de IDs estáticos
 */
@Injectable({
  providedIn: 'root'
})
export class EstadoUtilsService {

  /**
   * Mapeo de nombres de estado (normalizado) a configuración
   * Este mapeo es flexible y se basa en nombres, no en IDs
   */
  private readonly estadoConfigs: Record<string, EstadoConfig> = {
    'activo': {
      cssClass: 'bg-green-100 text-green-800',
      icon: 'check-circle',
      priority: 1,
      description: 'Equipo disponible para operación'
    },
    'disponible': {
      cssClass: 'bg-green-100 text-green-800',
      icon: 'check-circle',
      priority: 1,
      description: 'Equipo disponible para operación'
    },
    'operativo': {
      cssClass: 'bg-green-100 text-green-800',
      icon: 'check-circle',
      priority: 1,
      description: 'Equipo operativo'
    },
    'mantenimiento': {
      cssClass: 'bg-yellow-100 text-yellow-800',
      icon: 'wrench',
      priority: 2,
      description: 'Equipo en proceso de mantenimiento'
    },
    'reparacion': {
      cssClass: 'bg-yellow-100 text-yellow-800',
      icon: 'wrench',
      priority: 2,
      description: 'Equipo en reparación'
    },
    'servicio': {
      cssClass: 'bg-yellow-100 text-yellow-800',
      icon: 'wrench',
      priority: 2,
      description: 'Equipo en servicio'
    },
    'inactivo': {
      cssClass: 'bg-red-100 text-red-800',
      icon: 'x-circle',
      priority: 4,
      description: 'Equipo fuera de servicio'
    },
    'baja': {
      cssClass: 'bg-red-100 text-red-800',
      icon: 'x-circle',
      priority: 4,
      description: 'Equipo dado de baja'
    },
    'fuera_servicio': {
      cssClass: 'bg-red-100 text-red-800',
      icon: 'x-circle',
      priority: 4,
      description: 'Equipo fuera de servicio'
    },
    'indisponible': {
      cssClass: 'bg-gray-100 text-gray-800',
      icon: 'clock',
      priority: 3,
      description: 'Equipo temporalmente no disponible'
    },
    'reservado': {
      cssClass: 'bg-blue-100 text-blue-800',
      icon: 'calendar',
      priority: 2,
      description: 'Equipo reservado'
    },
    'en_transito': {
      cssClass: 'bg-purple-100 text-purple-800',
      icon: 'truck',
      priority: 2,
      description: 'Equipo en tránsito'
    }
  };

  /**
   * Normaliza el nombre de un estado para búsqueda
   */
  private normalizeEstadoName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Obtiene la clase CSS para un estado
   */
  getCssClass(estado: EstadoEquipoResponse | undefined): string {
    if (!estado?.nombre) {
      return this.estadoConfigs['indisponible'].cssClass;
    }

    const normalizedName = this.normalizeEstadoName(estado.nombre);
    const config = this.estadoConfigs[normalizedName];
    
    return config?.cssClass || this.estadoConfigs['indisponible'].cssClass;
  }

  /**
   * Obtiene el ícono para un estado
   */
  getIcon(estado: EstadoEquipoResponse | undefined): string | undefined {
    if (!estado?.nombre) {
      return this.estadoConfigs['indisponible'].icon;
    }

    const normalizedName = this.normalizeEstadoName(estado.nombre);
    const config = this.estadoConfigs[normalizedName];
    
    return config?.icon || this.estadoConfigs['indisponible'].icon;
  }

  /**
   * Obtiene la prioridad de un estado (para ordenamiento)
   */
  getPriority(estado: EstadoEquipoResponse | undefined): number {
    if (!estado?.nombre) {
      return this.estadoConfigs['indisponible'].priority;
    }

    const normalizedName = this.normalizeEstadoName(estado.nombre);
    const config = this.estadoConfigs[normalizedName];
    
    return config?.priority || this.estadoConfigs['indisponible'].priority;
  }

  /**
   * Obtiene la descripción de un estado
   */
  getDescription(estado: EstadoEquipoResponse | undefined): string {
    if (!estado?.nombre) {
      return this.estadoConfigs['indisponible'].description || 'Estado desconocido';
    }

    const normalizedName = this.normalizeEstadoName(estado.nombre);
    const config = this.estadoConfigs[normalizedName];
    
    return config?.description || estado.descripcion || estado.nombre;
  }

  /**
   * Verifica si un estado es operativo (disponible para usar)
   */
  isOperativo(estado: EstadoEquipoResponse | undefined): boolean {
    if (!estado?.nombre) return false;

    const normalizedName = this.normalizeEstadoName(estado.nombre);
    const config = this.estadoConfigs[normalizedName];
    
    return config?.priority === 1;
  }

  /**
   * Verifica si un estado requiere atención
   */
  requiresAttention(estado: EstadoEquipoResponse | undefined): boolean {
    if (!estado?.nombre) return false;

    const normalizedName = this.normalizeEstadoName(estado.nombre);
    const config = this.estadoConfigs[normalizedName];
    
    return config ? config.priority >= 3 : false;
  }

  /**
   * Ordena estados por prioridad
   */
  sortEstadosByPriority(estados: EstadoEquipoResponse[]): EstadoEquipoResponse[] {
    return [...estados].sort((a, b) => {
      const priorityA = this.getPriority(a);
      const priorityB = this.getPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Si tienen la misma prioridad, ordenar alfabéticamente
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
  }

  /**
   * Obtiene estadísticas agrupadas por estado
   */
  getEstadisticasEstados(equipos: { estadoEquipoResponse?: EstadoEquipoResponse }[]): {
    estado: EstadoEquipoResponse | null;
    count: number;
    percentage: number;
    cssClass: string;
  }[] {
    const total = equipos.length;
    if (total === 0) return [];

    // Agrupar por estado
    const grouped = equipos.reduce((acc, equipo) => {
      const estado = equipo.estadoEquipoResponse;
      const key = estado?.id || 'sin_estado';
      
      if (!acc[key]) {
        acc[key] = {
          estado: estado || null,
          count: 0
        };
      }
      acc[key].count++;
      
      return acc;
    }, {} as Record<string, { estado: EstadoEquipoResponse | null; count: number }>);

    // Convertir a array y calcular porcentajes
    return Object.values(grouped)
      .map(item => ({
        ...item,
        percentage: Math.round((item.count / total) * 100),
        cssClass: this.getCssClass(item.estado || undefined)
      }))
      .sort((a, b) => {
        const priorityA = this.getPriority(a.estado || undefined);
        const priorityB = this.getPriority(b.estado || undefined);
        return priorityA - priorityB;
      });
  }
}
