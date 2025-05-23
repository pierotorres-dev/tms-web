export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  userName: string;
  role: string;
  empresas: EmpresaInfo[];
  token: string;
  sessionToken: string;
  name: string;
  lastName: string;
}

export interface EmpresaInfo {
  id: number;
  nombre: string;
  email: string;
}

export interface RegisterRequest {
  userName: string;
  password: string;
  role: string;
  name: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
}

export interface UserResponse {
  id: number;
  userName: string;
  role: string;
}

export interface AuthResponse {
  token: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  path: string;
  timestamp: string;
}

export interface TokenValidationResponse {
  valid: boolean;
}

export interface UserSession {
  userId: number;
  userName: string;
  role: string;
  token: string;
  empresaId?: number;
  name: string;
  lastName: string;
}