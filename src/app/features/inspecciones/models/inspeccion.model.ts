import { DesgasteNeumatico } from "../../neumaticos/models/neumatico.model";

/**
 * Modelo que representa una inspección de neumáticos
 */
export interface Inspeccion {
  id: number;
  codigo: string;
  equipoId: number;
  fecha: Date;
  usuarioId: number;
  estado: EstadoInspeccion;
  empresaId: number;
  kilometraje?: number;
  horasUso?: number;
  observaciones?: string;
  detalles: DetalleInspeccion[];
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

/**
 * Detalle de inspección para un neumático específico
 */
export interface DetalleInspeccion {
  id: number;
  inspeccionId: number;
  neumaticoId: number;
  posicion: number;
  estadoVisual: EstadoVisualNeumatico;
  presion?: number;
  temperatura?: number;
  desgaste?: DesgasteNeumatico;
  observaciones?: string;
  requiereAccion: boolean;
  accionRecomendada?: AccionNeumatico;
}

/**
 * Estados posibles para una inspección
 */
export enum EstadoInspeccion {
  PENDIENTE = 'PENDIENTE',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA'
}

/**
 * Estado visual de un neumático durante una inspección
 */
export enum EstadoVisualNeumatico {
  OPTIMO = 'OPTIMO',
  BUENO = 'BUENO',
  REGULAR = 'REGULAR',
  DESGASTADO = 'DESGASTADO',
  CRITICO = 'CRITICO',
  DANADO = 'DANADO'
}

/**
 * Acciones recomendadas para un neumático
 */
export enum AccionNeumatico {
  NINGUNA = 'NINGUNA',
  AJUSTAR_PRESION = 'AJUSTAR_PRESION',
  ROTAR = 'ROTAR',
  REEMPLAZAR = 'REEMPLAZAR',
  REPARAR = 'REPARAR',
  REENCAUCHAR = 'REENCAUCHAR'
}
