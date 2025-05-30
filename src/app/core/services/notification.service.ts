import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  duration?: number; // in milliseconds
}

/**
 * Servicio para gestionar notificaciones y mensajes a nivel de aplicación
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationSubject.asObservable();
  
  private idCounter = 0;
  private defaultDuration = 5000; // 5 seconds
  
  /**
   * Muestra una notificación de éxito
   */
  success(message: string, duration?: number): void {
    this.addNotification({
      id: this.getNextId(),
      message,
      type: NotificationType.SUCCESS,
      duration: duration || this.defaultDuration
    });
  }
  
  /**
   * Muestra una notificación de error
   */
  error(message: string, duration?: number): void {
    this.addNotification({
      id: this.getNextId(),
      message,
      type: NotificationType.ERROR,
      duration: duration || this.defaultDuration
    });
  }
  
  /**
   * Muestra una notificación de advertencia
   */
  warning(message: string, duration?: number): void {
    this.addNotification({
      id: this.getNextId(),
      message,
      type: NotificationType.WARNING,
      duration: duration || this.defaultDuration
    });
  }
    /**
   * Muestra una notificación informativa
   */
  info(message: string, duration?: number): void {
    this.addNotification({
      id: this.getNextId(),
      message,
      type: NotificationType.INFO,
      duration: duration || this.defaultDuration
    });
  }

  /**
   * Notificación específica para renovación de token exitosa
   */
  tokenRefreshed(): void {
    this.success('🔒 Sesión renovada automáticamente', 3000);
  }

  /**
   * Notificación de advertencia sobre próxima expiración de sesión
   */
  sessionExpiringSoon(minutesRemaining: number): void {
    this.warning(
      `⏰ Su sesión expirará en ${minutesRemaining} minutos. Los datos se guardarán automáticamente.`,
      8000
    );
  }

  /**
   * Notificación informativa sobre el estado de conectividad
   */
  connectionStatus(isOnline: boolean): void {
    if (isOnline) {
      this.success('🌐 Conexión restablecida', 3000);
    } else {
      this.warning('🔌 Sin conexión - Trabajando en modo offline', 0); // No auto-remove
    }
  }
  
  /**
   * Elimina una notificación específica
   */
  removeNotification(id: number): void {
    const currentNotifications = this.notificationSubject.value;
    this.notificationSubject.next(
      currentNotifications.filter(notification => notification.id !== id)
    );
  }
  
  /**
   * Añade una notificación y configura su auto-eliminación
   */
  private addNotification(notification: Notification): void {
    const currentNotifications = this.notificationSubject.value;
    this.notificationSubject.next([...currentNotifications, notification]);
    
    // Configurar auto-eliminación después del tiempo especificado
    if (notification.duration) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }
  }
  
  /**
   * Genera un ID único para cada notificación
   */
  private getNextId(): number {
    return ++this.idCounter;
  }
}
