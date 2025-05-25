import { EquipoResponse, EquipoRequest, ObservacionEquipoResponse, ObservacionEquipoRequest } from './fleet.dto';
import { Equipo, EstadoEquipo } from './equipo.model';

/**
 * Mappers para convertir entre DTOs y modelos de dominio
 */
export class FleetMapper {
}

/**
 * Interfaces adicionales para el dominio Fleet
 */

/**
 * Opciones para operaciones del servicio Fleet
 */
export interface FleetServiceOptions {
  showErrorNotification?: boolean;
  showSuccessNotification?: boolean;
  loadingMessage?: string;
}