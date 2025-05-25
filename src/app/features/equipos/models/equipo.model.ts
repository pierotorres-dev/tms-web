/**
 * Modelo que representa un equipo (vehículo) en el sistema
 */
export interface Equipo {
  id: number;
  placa: string;
  negocio: string;
  equipo: string;
  fechaInspeccion: Date;
  kilometraje: number;
  estadoId: number;
  empresaId: number
}

/**
 * Estados posibles para un equipo
 */
export enum EstadoEquipo {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  MANTENIMIENTO = 'MANTENIMIENTO',
  INDISPONIBLE = 'INDISPONIBLE'
}
