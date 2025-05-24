/**
 * DTOs para el servicio Fleet - Gestión de equipos, observaciones y catálogos
 */

// ==================== CATALOGOS DTOs ====================

/**
 * DTO para Tipo de Observación de Neumático
 */
export interface TipoObservacionNeumaticoDto {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

/**
 * DTO para Estado de Observación
 */
export interface EstadoObservacionDto {
  id: number;
  nombre: string;
  descripcion?: string;
}

/**
 * DTO para Estado de Equipo
 */
export interface EstadoEquipoDto {
  id: number;
  nombre: string;
  descripcion?: string;
}

// ==================== EQUIPOS DTOs ====================

/**
 * DTO para crear/actualizar un equipo
 */
export interface EquipoRequestDto {
  placa: string;
  negocio?: string;
  equipo?: string;
  fechaInspeccion?: Date;
  kilometraje?: number;
  estadoId: number;
  empresaId: number;
  // Campos adicionales para formulario completo
  codigo?: string;
  tipoEquipo?: string;
  modelo?: string;
  marca?: string;
  anio?: number;
  numeroChasis?: string;
  numeroMotor?: string;
  capacidadCarga?: number;
  kmActual?: number;
  horasOperacion?: number;
  observaciones?: string;
  fechaCompra?: Date;
  fechaVencimientoSeguro?: Date;
}

/**
 * DTO de respuesta para un equipo
 */
export interface EquipoResponseDto {
  id: number;
  placa: string;
  negocio?: string;
  equipo?: string;
  fechaInspeccion?: Date;
  kilometraje?: number;
  estadoEquipoResponse: EstadoEquipoDto;
  empresaId: number;
  // Campos adicionales para respuesta completa
  codigo?: string;
  tipoEquipo?: string;
  modelo?: string;
  marca?: string;
  anio?: number;
  numeroChasis?: string;
  numeroMotor?: string;
  estadoId?: number;
  capacidadCarga?: number;
  kmActual?: number;
  horasOperacion?: number;
  observaciones?: string;
  fechaCompra?: Date;
  fechaVencimientoSeguro?: Date;
}

// ==================== OBSERVACIONES DTOs ====================

/**
 * DTO para crear/actualizar una observación de equipo
 */
export interface ObservacionEquipoRequestDto {
  equipoId: number;
  fecha?: Date;
  tipoObservacionId: number;
  descripcion?: string;
  estadoId: number;
  fechaResolucion?: Date;
  comentarioResolucion?: string;
  usuarioResolucion?: string;
  usuarioId?: number;
}

/**
 * DTO de respuesta para una observación de equipo
 */
export interface ObservacionEquipoResponseDto {
  id: number;
  equipoId: number;
  fecha: Date;
  tipoObservacionNeumaticoResponse: TipoObservacionNeumaticoDto;
  descripcion?: string;
  estadoObservacionResponse: EstadoObservacionDto;
  fechaResolucion?: Date;
  comentarioResolucion?: string;
  usuarioResolucion?: string;
  usuarioId?: number;
}

// ==================== ERROR DTOs ====================

/**
 * DTO para respuestas de error de la API
 */
export interface ErrorResponseDto {
  code: string;
  message: string;
  path: string;
  timestamp: Date;
}

// ==================== TIPOS DE UNIÓN Y FILTROS ====================

/**
 * Parámetros para filtrar equipos
 */
export interface EquipoFilters {
  empresaId?: number;
  estadoId?: number;
  placa?: string;
  equipo?: string;
  negocio?: string;
  // Campos adicionales para búsqueda y filtrado
  search?: string;
  tipoEquipo?: string;
}

/**
 * Parámetros para filtrar observaciones
 */
export interface ObservacionFilters {
  equipoId?: number;
  estadoId?: number;
  tipoObservacionId?: number;
  fechaDesde?: Date;
  fechaHasta?: Date;
  usuarioId?: number;
  // Campos adicionales para búsqueda y filtrado
  search?: string;
  estadoObservacionId?: number;
  esCritica?: boolean;
}

/**
 * Respuesta genérica para operaciones de actualización masiva
 */
export interface UpdateMasivoResponseDto {
  cantidadActualizados: number;
  mensaje?: string;
}
