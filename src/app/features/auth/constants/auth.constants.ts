/**
 * Constantes para las rutas de la API de autenticación
 */
export const AUTH_API = {
  LOGIN: '/api/auth/login',
  VALIDATE_TOKEN: '/api/auth/validate',
  REGISTER: '/api/users/register',
  GENERATE_TOKEN: '/api/tokens/generate',
  REFRESH_TOKEN: '/api/tokens/refresh'
};

/**
 * Constantes para manejo de tokens en localStorage
 */
export const TOKEN_STORAGE = {
  AUTH_TOKEN: 'tms_auth_token',
  SESSION_TOKEN: 'tms_session_token',
  USER_DATA: 'tms_user_data',
  SELECTED_EMPRESA: 'tms_selected_empresa',
  EMPRESAS_LIST: 'tms_empresas_list',
  LOGIN_TIMESTAMP: 'tms_login_timestamp',
  TOKEN_EXPIRY: 'tms_token_expiry'
};

/**
 * Constantes de tiempo para manejo de sesiones
 */
export const SESSION_CONFIG = {
  TOKEN_LIFETIME: 60 * 60 * 1000, // 1 hora en milisegundos
  SESSION_LIFETIME: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos antes de expirar
  REFRESH_INTERVAL: 30 * 60 * 1000, // Verificar cada 30 minutos
  RETRY_ATTEMPTS: 3, // Número de intentos de reintento
  RETRY_DELAY: 5000, // Retraso entre reintentos (5 segundos)
  WARNING_THRESHOLDS: {
    CRITICAL: 5 * 60 * 1000, // 5 minutos
    WARNING: 15 * 60 * 1000, // 15 minutos
    INFO: 30 * 60 * 1000 // 30 minutos
  }
};
