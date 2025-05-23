/**
 * Constantes para códigos de respuesta HTTP
 */
export enum HttpStatusCodes {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Constantes para mensajes de error
 */
export const ErrorMessages = {
  DEFAULT: 'Ha ocurrido un error. Por favor, inténtelo de nuevo.',
  UNAUTHORIZED: 'No está autorizado para acceder a este recurso.',
  SESSION_EXPIRED: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
  CONNECTION: 'Error de conexión. Verifique su conexión a internet.',
  NOT_FOUND: 'El recurso solicitado no está disponible.',
  SERVER_ERROR: 'Error en el servidor. Por favor, inténtelo más tarde.',
  VALIDATION: 'Los datos proporcionados no son válidos.',
  TOO_MANY_REQUESTS: 'Demasiadas solicitudes. Por favor, espere un momento e inténtelo de nuevo.'
};
