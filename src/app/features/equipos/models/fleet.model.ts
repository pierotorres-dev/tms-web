import { EquipoResponseDto, EquipoRequestDto, ObservacionEquipoResponseDto, ObservacionEquipoRequestDto } from './fleet.dto';
import { Equipo, EstadoEquipo } from './equipo.model';

/**
 * Mappers para convertir entre DTOs y modelos de dominio
 */
export class FleetMapper {
  
  /**
   * Convierte un EquipoResponseDto a modelo de dominio Equipo
   */
  static toDomainEquipo(dto: EquipoResponseDto): Equipo {
    return {
      id: dto.id,
      codigo: dto.placa,
      tipo: dto.equipo || '',
      marca: dto.negocio || '',
      modelo: dto.equipo || '',
      serie: '', // No está en el DTO de la API
      anio: new Date().getFullYear(), // Valor por defecto
      estado: this.mapEstadoEquipo(dto.estadoEquipoResponse.nombre),
      empresaId: dto.empresaId,
      ultimaInspeccion: dto.fechaInspeccion,
      posicionesNeumaticos: 0, // Valor por defecto
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
  }

  /**
   * Convierte un modelo Equipo a EquipoRequestDto
   */
  static toRequestDto(equipo: Partial<Equipo>): EquipoRequestDto {
    return {
      placa: equipo.codigo || '',
      negocio: equipo.marca,
      equipo: equipo.tipo,
      fechaInspeccion: equipo.ultimaInspeccion,
      kilometraje: 0, // Valor por defecto
      estadoId: this.getEstadoId(equipo.estado),
      empresaId: equipo.empresaId || 0
    };
  }

  /**
   * Mapea el nombre del estado a EstadoEquipo enum
   */
  private static mapEstadoEquipo(estadoNombre: string): EstadoEquipo {
    switch (estadoNombre.toUpperCase()) {
      case 'ACTIVO':
        return EstadoEquipo.ACTIVO;
      case 'INACTIVO':
        return EstadoEquipo.INACTIVO;
      case 'EN_MANTENIMIENTO':
        return EstadoEquipo.EN_MANTENIMIENTO;
      case 'DE_BAJA':
        return EstadoEquipo.DE_BAJA;
      default:
        return EstadoEquipo.ACTIVO;
    }
  }

  /**
   * Obtiene el ID del estado basándose en el enum
   */
  private static getEstadoId(estado?: EstadoEquipo): number {
    switch (estado) {
      case EstadoEquipo.ACTIVO:
        return 1;
      case EstadoEquipo.INACTIVO:
        return 2;
      case EstadoEquipo.EN_MANTENIMIENTO:
        return 3;
      case EstadoEquipo.DE_BAJA:
        return 4;
      default:
        return 1;
    }
  }
}

/**
 * Interfaces adicionales para el dominio Fleet
 */

/**
 * Configuración de paginación para listas
 */
export interface PaginationConfig {
  page: number;
  size: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Respuesta paginada genérica
 */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * Opciones para operaciones del servicio Fleet
 */
export interface FleetServiceOptions {
  showErrorNotification?: boolean;
  showSuccessNotification?: boolean;
  loadingMessage?: string;
}

/**
 * Contexto de operación para auditoria
 */
export interface OperationContext {
  usuarioId?: number;
  timestamp: Date;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  entityType: 'EQUIPO' | 'OBSERVACION';
  entityId?: number;
}