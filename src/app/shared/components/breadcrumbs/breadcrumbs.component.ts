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
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.css'
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
