/**
 * Modelo que representa un neumático en el sistema
 */
export interface Neumatico {
  id: number;
  codigo: string;
  marca: string;
  modelo: string;
  serie: string;
  diametro: number;
  estado: EstadoNeumatico;
  empresaId: number;
  equipoId?: number;
  posicion?: number;
  fechaInstalacion?: Date;
  fechaFabricacion?: Date;
  profundidadOriginal: number;
  profundidadActual?: number;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
}

/**
 * Estados posibles para un neumático
 */
export enum EstadoNeumatico {
  NUEVO = 'NUEVO',
  EN_USO = 'EN_USO',
  RETIRADO = 'RETIRADO',
  REENCAUCHADO = 'REENCAUCHADO',
  DESECHADO = 'DESECHADO'
}

/**
 * Modelo para la información de desgaste de un neumático
 */
export interface DesgasteNeumatico {
  id: number;
  neumaticoId: number;
  fechaMedicion: Date;
  profundidadExterior: number;
  profundidadCentral: number;
  profundidadInterior: number;
  kilometraje?: number;
  horasUso?: number;
  observaciones?: string;
}
