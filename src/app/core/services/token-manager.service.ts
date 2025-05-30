import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TokenStatus {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  nextRefresh: Date | null;
  sessionTimeRemaining: number; // en milisegundos
}

/**
 * Servicio que gestiona el estado y estado visual de los tokens
 * Proporciona información sobre el estado de renovación de tokens para la UI
 */
@Injectable({
  providedIn: 'root'
})
export class TokenManagerService {
  private tokenStatusSubject = new BehaviorSubject<TokenStatus>({
    isRefreshing: false,
    lastRefresh: null,
    nextRefresh: null,
    sessionTimeRemaining: 0
  });

  tokenStatus$ = this.tokenStatusSubject.asObservable();

  /**
   * Indica que se está refrescando un token
   */
  setRefreshing(isRefreshing: boolean): void {
    const currentStatus = this.tokenStatusSubject.value;
    this.tokenStatusSubject.next({
      ...currentStatus,
      isRefreshing,
      lastRefresh: isRefreshing ? new Date() : currentStatus.lastRefresh
    });
  }

  /**
   * Actualiza el tiempo restante de la sesión
   */
  updateSessionTimeRemaining(timeRemaining: number): void {
    const currentStatus = this.tokenStatusSubject.value;
    this.tokenStatusSubject.next({
      ...currentStatus,
      sessionTimeRemaining: timeRemaining
    });
  }

  /**
   * Actualiza cuándo será el próximo refresh
   */
  setNextRefresh(nextRefresh: Date): void {
    const currentStatus = this.tokenStatusSubject.value;
    this.tokenStatusSubject.next({
      ...currentStatus,
      nextRefresh
    });
  }

  /**
   * Obtiene el estado actual del token
   */
  getCurrentStatus(): TokenStatus {
    return this.tokenStatusSubject.value;
  }

  /**
   * Resetea el estado del token
   */
  reset(): void {
    this.tokenStatusSubject.next({
      isRefreshing: false,
      lastRefresh: null,
      nextRefresh: null,
      sessionTimeRemaining: 0
    });
  }
}
