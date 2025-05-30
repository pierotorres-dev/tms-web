import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-empresa-selector-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empresa-selector-modal.component.html',
  styleUrl: './empresa-selector-modal.component.css'
})
export class EmpresaSelectorModalComponent implements OnInit {
  private empresaContextService = inject(EmpresaContextService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  @Input() isOpen = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() empresaChanged = new EventEmitter<EmpresaInfo>();

  availableEmpresas: EmpresaInfo[] = [];
  currentEmpresa: EmpresaInfo | null = null;
  isLoading = false;

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.availableEmpresas = this.empresaContextService.getAvailableEmpresas();
    this.currentEmpresa = this.empresaContextService.getSelectedEmpresa();
  }

  selectEmpresa(empresa: EmpresaInfo): void {
    if (empresa.id === this.currentEmpresa?.id) {
      // Si es la misma empresa, no hacer nada
      return;
    }

    this.isLoading = true;

    // Actualizar la empresa seleccionada usando el contexto service
    this.empresaContextService.setSelectedEmpresa(empresa);
    // Mostrar notificación de éxito
    this.notificationService.success(
      `Empresa cambiada a: ${empresa.nombre}`
    );

    // Emitir evento de cambio
    this.empresaChanged.emit(empresa);

    // Cerrar modal después de un breve delay para mostrar el feedback
    setTimeout(() => {
      this.isLoading = false;
      this.closeModal();
    }, 500);
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  trackByEmpresaId(index: number, empresa: EmpresaInfo): number {
    return empresa.id;
  }

  getEmpresaInitials(nombre: string): string {
    if (!nombre) return '??';

    const words = nombre.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return words.slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  getEmpresaCardClasses(empresa: EmpresaInfo): string {
    const baseClasses = 'border-gray-200';

    if (empresa.id === this.currentEmpresa?.id) {
      return `${baseClasses} border-green-200 bg-green-50`;
    }

    return `${baseClasses} hover:border-blue-300 hover:bg-blue-50`;
  }
}
