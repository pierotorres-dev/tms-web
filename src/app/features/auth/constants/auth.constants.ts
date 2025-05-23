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
  SELECTED_EMPRESA: 'tms_selected_empresa'
};
