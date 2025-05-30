import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { TokenManagerService, TokenStatus } from '../../../core/services/token-manager.service';

/**
 * Componente que muestra el estado de la conexión y tokens
 * Proporciona feedback visual sobre renovación de tokens y tiempo de sesión
 */
@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="connection-status" [ngClass]="getStatusClass()">
      <div class="status-indicator">
        <div class="indicator-dot" [ngClass]="getIndicatorClass()"></div>
        <span class="status-text">{{ getStatusText() }}</span>
      </div>
      
      <div class="session-info" *ngIf="tokenStatus && !tokenStatus.isRefreshing">
        <span class="session-time">
          Sesión: {{ getSessionTimeFormatted() }}
        </span>
        <span class="next-refresh" *ngIf="tokenStatus.nextRefresh">
          Próx. renovación: {{ getNextRefreshFormatted() }}
        </span>
      </div>
      
      <div class="refresh-indicator" *ngIf="tokenStatus?.isRefreshing">
        <div class="spinner"></div>
        <span>Renovando token...</span>
      </div>
    </div>
  `,
  styles: [`
    .connection-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      transition: all 0.3s ease;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .connection-status.connected {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }

    .connection-status.refreshing {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #3b82f6;
    }

    .connection-status.warning {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
      color: #f59e0b;
    }

    .connection-status.error {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .indicator-dot.connected {
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
    }

    .indicator-dot.refreshing {
      background: #3b82f6;
      animation: pulse 1.5s infinite;
    }

    .indicator-dot.warning {
      background: #f59e0b;
      animation: pulse 2s infinite;
    }

    .indicator-dot.error {
      background: #ef4444;
    }

    .session-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      opacity: 0.8;
    }

    .refresh-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.1);
      }
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .status-text {
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .connection-status {
        font-size: 11px;
        padding: 6px 8px;
        gap: 8px;
      }
      
      .session-info {
        display: none;
      }
    }
  `]
})
export class ConnectionStatusComponent implements OnInit, OnDestroy {
  tokenStatus: TokenStatus | null = null;
  private destroy$ = new Subject<void>();

  constructor(private tokenManager: TokenManagerService) {}

  ngOnInit(): void {
    this.tokenManager.tokenStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.tokenStatus = status;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusClass(): string {
    if (!this.tokenStatus) return 'error';
    
    if (this.tokenStatus.isRefreshing) return 'refreshing';
    
    const sessionTimeRemaining = this.tokenStatus.sessionTimeRemaining;
    if (sessionTimeRemaining <= 0) return 'error';
    if (sessionTimeRemaining < 5 * 60 * 1000) return 'warning'; // Menos de 5 minutos
    
    return 'connected';
  }

  getIndicatorClass(): string {
    return this.getStatusClass();
  }

  getStatusText(): string {
    if (!this.tokenStatus) return 'Desconectado';
    
    if (this.tokenStatus.isRefreshing) return 'Renovando';
    
    const sessionTimeRemaining = this.tokenStatus.sessionTimeRemaining;
    if (sessionTimeRemaining <= 0) return 'Sesión expirada';
    if (sessionTimeRemaining < 5 * 60 * 1000) return 'Sesión por expirar';
    
    return 'Conectado';
  }

  getSessionTimeFormatted(): string {
    if (!this.tokenStatus?.sessionTimeRemaining) return '0m';
    
    const hours = Math.floor(this.tokenStatus.sessionTimeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((this.tokenStatus.sessionTimeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getNextRefreshFormatted(): string {
    if (!this.tokenStatus?.nextRefresh) return '';
    
    const now = new Date();
    const nextRefresh = new Date(this.tokenStatus.nextRefresh);
    const diffMs = nextRefresh.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Ahora';
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}
