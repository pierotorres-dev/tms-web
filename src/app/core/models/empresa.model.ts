/**
 * Modelo para información de empresa
 */
export interface Empresa {
  id: number;
  nombre?: string;
  rut?: string;
  direccion?: string;
  logo?: string;
  estado?: boolean;
}
