import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification, NotificationType } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css'
})
export class ToastContainerComponent implements OnInit {
  private notificationService = inject(NotificationService);

  notifications: Notification[] = [];

  ngOnInit(): void {
    this.notificationService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
  }

  removeNotification(id: number): void {
    this.notificationService.removeNotification(id);
  }
}