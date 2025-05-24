/**
 * Modelo que representa un equipo (vehículo) en el sistema
 */
export interface Equipo {
  id: number;
  codigo: string;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  anio: number;
  estado: EstadoEquipo;
  empresaId: number;
  ultimaInspeccion?: Date;
  posicionesNeumaticos: number;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
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
