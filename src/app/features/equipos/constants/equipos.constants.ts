/**
 * Constantes para el módulo de equipos y fleet service
 */

// ==================== API ENDPOINTS ====================

/**
 * Endpoints base para la API Fleet
 */
export const FLEET_API_ENDPOINTS = {
  // Catálogos
  CATALOGOS: {
    TIPO_OBSERVACION_NEUMATICO: '/api/v1/catalogos/tipo-observacion-neumatico',
    ESTADO_OBSERVACION: '/api/v1/catalogos/estado-observacion',
    ESTADO_EQUIPO: '/api/v1/catalogos/estado-equipo',
  },
  
  // Equipos
  EQUIPOS: {
    BASE: '/api/v1/equipos',
    BY_EMPRESA: (empresaId: number) => `/api/v1/equipos/empresa/${empresaId}`,
    BY_ID: (id: number) => `/api/v1/equipos/${id}`,
    UPDATE_ESTADO: (id: number, estadoId: number) => `/api/v1/equipos/${id}/estado/${estadoId}`,
  },
  
  // Observaciones
  OBSERVACIONES: {
    BASE: '/api/v1/observaciones-equipo',
    BY_EQUIPO: (equipoId: number) => `/api/v1/observaciones-equipo/equipo/${equipoId}`,
    BY_ID: (id: number) => `/api/v1/observaciones-equipo/${id}`,
    UPDATE_ESTADO_BY_EQUIPO: (equipoId: number, estadoId: number) => 
      `/api/v1/observaciones-equipo/equipo/${equipoId}/estado/${estadoId}`,
  }
} as const;

// ==================== MENSAJES DE NOTIFICACIÓN ====================

/**
 * Mensajes para notificaciones del módulo Fleet
 */
export const FLEET_MESSAGES = {
  // Éxito
  SUCCESS: {
    EQUIPO_CREADO: 'Equipo creado exitosamente',
    EQUIPO_ACTUALIZADO: 'Equipo actualizado exitosamente',
    EQUIPO_ELIMINADO: 'Equipo eliminado exitosamente',
    ESTADO_EQUIPO_ACTUALIZADO: 'Estado del equipo actualizado exitosamente',
    OBSERVACION_CREADA: 'Observación creada exitosamente',
    OBSERVACION_ACTUALIZADA: 'Observación actualizada exitosamente',
    OBSERVACIONES_ESTADO_ACTUALIZADO: 'Estado de observaciones actualizado exitosamente',
  },
  
  // Error
  ERROR: {
    EQUIPO_NO_ENCONTRADO: 'Equipo no encontrado',
    OBSERVACION_NO_ENCONTRADA: 'Observación no encontrada',
    PLACA_DUPLICADA: 'Ya existe un equipo con esta placa',
    DATOS_INVALIDOS: 'Los datos proporcionados no son válidos',
    SIN_PERMISOS: 'No tiene permisos para realizar esta operación',
  },
  
  // Carga
  LOADING: {
    CARGANDO_EQUIPOS: 'Cargando equipos...',
    CARGANDO_EQUIPO: 'Cargando información del equipo...',
    GUARDANDO_EQUIPO: 'Guardando equipo...',
    ACTUALIZANDO_ESTADO: 'Actualizando estado...',
    CARGANDO_OBSERVACIONES: 'Cargando observaciones...',
    GUARDANDO_OBSERVACION: 'Guardando observación...',
    CARGANDO_CATALOGOS: 'Cargando catálogos...',
  }
} as const;

// ==================== CONFIGURACIÓN PAGINACIÓN ====================

/**
 * Configuración por defecto para paginación
 */
export const FLEET_PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
  DEFAULT_SORT_BY: 'id',
  DEFAULT_SORT_DIRECTION: 'desc' as const,
} as const;

// ==================== CONFIGURACIÓN DE VALIDACIÓN ====================

/**
 * Reglas de validación para formularios
 */
export const FLEET_VALIDATION_RULES = {
  EQUIPO: {
    PLACA: {
      MIN_LENGTH: 6,
      MAX_LENGTH: 10,
      PATTERN: /^[A-Z0-9-]+$/,
    },
    NEGOCIO: {
      MAX_LENGTH: 100,
    },
    EQUIPO: {
      MAX_LENGTH: 100,
    },
    KILOMETRAJE: {
      MIN: 0,
      MAX: 9999999,
    },
  },
  
  OBSERVACION: {
    DESCRIPCION: {
      MAX_LENGTH: 500,
    },
    COMENTARIO_RESOLUCION: {
      MAX_LENGTH: 500,
    },
  }
} as const;

// ==================== ESTADOS POR DEFECTO ====================

/**
 * IDs de estados por defecto (estos pueden variar según la base de datos)
 */
export const DEFAULT_ESTADO_IDS = {
  EQUIPO: {
    ACTIVO: 1,
    INACTIVO: 2,
    EN_MANTENIMIENTO: 3,
    DE_BAJA: 4,
  },
  
  OBSERVACION: {
    PENDIENTE: 1,
    EN_PROCESO: 2,
    RESUELTO: 3,
    CANCELADO: 4,
  }
} as const;

// ==================== CONFIGURACIÓN DE CACHÉ ====================

/**
 * Configuración para el cache de datos
 */
export const FLEET_CACHE_CONFIG = {
  CATALOGOS_TTL: 5 * 60 * 1000, // 5 minutos
  EQUIPOS_TTL: 2 * 60 * 1000,   // 2 minutos
  OBSERVACIONES_TTL: 1 * 60 * 1000, // 1 minuto
} as const;

// ==================== EQUIPOS_CONSTANTS (Compatibility Export) ====================

/**
 * Constantes principales para equipos (exportación de compatibilidad)
 */
export const EQUIPOS_CONSTANTS = {
  MESSAGES: {
    EQUIPO_CREATED: FLEET_MESSAGES.SUCCESS.EQUIPO_CREADO,
    EQUIPO_UPDATED: FLEET_MESSAGES.SUCCESS.EQUIPO_ACTUALIZADO,
    EQUIPO_DELETED: FLEET_MESSAGES.SUCCESS.EQUIPO_ELIMINADO,
    OBSERVACION_CREATED: FLEET_MESSAGES.SUCCESS.OBSERVACION_CREADA,
    OBSERVACION_UPDATED: FLEET_MESSAGES.SUCCESS.OBSERVACION_ACTUALIZADA,
    OBSERVACION_RESOLVED: 'Observación resuelta correctamente',
    OBSERVACIONES_RESOLVED: 'Observaciones resueltas correctamente',
    OBSERVACIONES_DELETED: 'Observaciones eliminadas correctamente',
    EXPORT_SUCCESS: 'Datos exportados exitosamente',
    BULK_OPERATION_SUCCESS: 'Operación masiva completada exitosamente',
  },
  
  VALIDATION: FLEET_VALIDATION_RULES,
  PAGINATION: FLEET_PAGINATION_CONFIG,
  ESTADOS: DEFAULT_ESTADO_IDS,
} as const;