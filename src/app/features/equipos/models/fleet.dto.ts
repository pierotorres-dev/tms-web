/**
 * DTOs para el servicio Fleet - Gestión de equipos, observaciones y catálogos
 */

// ==================== CATALOGOS DTOs ====================

/**
 * DTO para Tipo de Observación de Neumático
 */
export interface TipoObservacionNeumaticoResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

/**
 * DTO para Estado de Observación
 */
export interface EstadoObservacionResponse {
  id: number;
  nombre: string;
  descripcion?: string;
}

/**
 * DTO para Estado de Equipo
 */
export interface EstadoEquipoResponse {
  id: number;
  nombre: string;
  descripcion?: string;
}

// ==================== EQUIPOS DTOs ====================

/**
 * DTO para crear/actualizar un equipo
 */
export interface EquipoRequest {
  placa: string;
  negocio: string;
  equipo: string;
  fechaInspeccion: Date;
  kilometraje: number;
  estadoId: number;
  empresaId: number
}

/**
 * DTO de respuesta para un equipo
 */
export interface EquipoResponse {
  id: number;
  placa: string;
  negocio: string;
  equipo: string;
  fechaInspeccion: Date;
  kilometraje: number;
  estadoEquipoResponse?: EstadoEquipoResponse;
  empresaId: number
}

// ==================== OBSERVACIONES DTOs ====================

/**
 * DTO para crear/actualizar una observación de equipo
 */
export interface ObservacionEquipoRequest {
  equipoId: number;
  fecha: Date;
  tipoObservacionId: number;
  descripcion: string;
  estadoId: number;
  fechaResolucion: Date;
  comentarioResolucion: string;
  usuarioResolucion: number;
  usuarioId: number
}

/**
 * DTO de respuesta para una observación de equipo
 */
export interface ObservacionEquipoResponse {
  id: number;
  equipoId: number;
  fecha: Date;
  tipoObservacionNeumaticoResponse: TipoObservacionNeumaticoResponse;
  descripcion?: string;
  estadoObservacionResponse: EstadoObservacionResponse;
  fechaResolucion?: Date;
  comentarioResolucion?: string;
  usuarioResolucion?: number;
  usuarioId?: number;
}

// ==================== ERROR DTOs ====================

/**
 * DTO para respuestas de error de la API
 */
export interface ErrorResponse {
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
  negocio?: string
}

/**
 * Parámetros para filtrar observaciones
 */
export interface ObservacionFilters {
  equipoId?: number;
  estadoId?: number;
  tipoObservacionId?: number;
  fechaDesde?: Date;
  fechaHasta?: Date
}