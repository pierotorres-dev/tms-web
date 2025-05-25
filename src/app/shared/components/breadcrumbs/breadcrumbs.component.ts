import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { EmpresaContextService } from '../../../core/services/empresa-context.service';
import { EmpresaInfo } from '../../../features/auth/models/auth.model';

interface BreadcrumbItem {
  label: string;
  url?: string;
  active: boolean;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="bg-gray-50 border-b border-gray-200 px-4 py-3" aria-label="Breadcrumb">
      <div class="max-w-7xl mx-auto">
        <div class="flex items-center justify-between">
          <!-- Breadcrumbs -->
          <ol class="flex items-center space-x-2">
            <!-- Empresa Context -->
            <li class="flex items-center" *ngIf="selectedEmpresa">
              <div class="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
                <div class="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  {{ getEmpresaInitials(selectedEmpresa.nombre) }}
                </div>
                <span class="text-sm font-medium text-blue-800">{{ selectedEmpresa.nombre }}</span>
              </div>
              <svg class="ml-2 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </li>

            <!-- Navigation Breadcrumbs -->
            <li *ngFor="let item of breadcrumbs; let last = last" class="flex items-center">
              <a 
                *ngIf="!item.active && item.url; else staticItem"
                [routerLink]="item.url"
                class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200">
                {{ item.label }}
              </a>
              <ng-template #staticItem>
                <span 
                  class="text-sm font-medium"
                  [class.text-gray-900]="item.active"
                  [class.text-gray-600]="!item.active">
                  {{ item.label }}
                </span>
              </ng-template>
              
              <svg 
                *ngIf="!last" 
                class="ml-2 h-4 w-4 text-gray-400" 
                fill="currentColor" 
                viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </li>
          </ol>

          <!-- Empresa ID Badge -->
          <div class="flex items-center space-x-2" *ngIf="selectedEmpresa">
            <span class="text-xs text-gray-500">ID Empresa:</span>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {{ selectedEmpresa.id }}
            </span>
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class BreadcrumbsComponent implements OnInit {
  private router = inject(Router);
  private empresaContextService = inject(EmpresaContextService);

  @Input() customBreadcrumbs: BreadcrumbItem[] = [];

  breadcrumbs: BreadcrumbItem[] = [];
  selectedEmpresa: EmpresaInfo | null = null;

  private routeLabels: { [key: string]: string } = {
    'dashboard': 'Panel de Control',
    'equipos': 'Equipos',
    'equipos-list': 'Lista de Equipos',
    'neumaticos': 'Neumáticos',
    'inspecciones': 'Inspecciones',
    'profile': 'Perfil'
  };

  ngOnInit(): void {
    // Subscribe to empresa context
    this.empresaContextService.selectedEmpresa$.subscribe(
      empresa => {
        this.selectedEmpresa = empresa;
      }
    );

    // Subscribe to router events to update breadcrumbs
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.createBreadcrumbs()),
        startWith(this.createBreadcrumbs())
      )
      .subscribe(breadcrumbs => {
        this.breadcrumbs = breadcrumbs;
      });
  }

  /**
   * Generate initials for empresa name
   */
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

  /**
   * Create breadcrumbs from current route
   */
  private createBreadcrumbs(): BreadcrumbItem[] {
    if (this.customBreadcrumbs.length > 0) {
      return this.customBreadcrumbs;
    }

    const urlSegments = this.router.url.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [];

    let currentPath = '';
    urlSegments.forEach((segment, index) => {
      currentPath += '/' + segment;
      const isLast = index === urlSegments.length - 1;
      
      const label = this.routeLabels[segment] || this.formatSegment(segment);
      
      breadcrumbs.push({
        label,
        url: isLast ? undefined : currentPath,
        active: isLast
      });
    });

    return breadcrumbs;
  }

  /**
   * Format URL segment to readable label
   */
  private formatSegment(segment: string): string {
    return segment
      .replace(/-/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }
}
