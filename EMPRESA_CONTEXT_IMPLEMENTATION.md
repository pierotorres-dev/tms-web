# Gestión de Contexto Empresarial - Guía de Implementación

## Resumen de la Solución

Esta implementación proporciona una solución completa para gestionar el contexto de empresa seleccionada en toda la aplicación TMS, siguiendo las mejores prácticas de UX y arquitectura frontend de Angular.

## Componentes Implementados

### 1. EmpresaContextService
**Ubicación:** `src/app/core/services/empresa-context.service.ts`

Servicio centralizado que gestiona el estado de la empresa seleccionada en toda la aplicación.

**Características principales:**
- Observables reactivos para la empresa seleccionada
- Métodos síncronos para validaciones rápidas
- Integración con AuthService
- Validación de contexto empresarial

**Uso básico:**
```typescript
// En cualquier componente
constructor(private empresaContext: EmpresaContextService) {}

ngOnInit() {
  // Obtener empresa actual (reactivo)
  this.empresaContext.selectedEmpresa$.subscribe(empresa => {
    if (empresa) {
      console.log('Empresa actual:', empresa.nombre);
    }
  });

  // Verificar si hay empresa seleccionada (síncrono)
  if (this.empresaContext.hasSelectedEmpresa()) {
    const empresaId = this.empresaContext.getCurrentEmpresaId();
  }
}
```

### 2. Header Component Mejorado
**Ubicación:** `src/app/layout/components/header/header.component.ts`

**Características nuevas:**
- Indicador de empresa en desktop (centro del header)
- Menú desplegable de usuario mejorado con información de empresa
- Opción "Cambiar Empresa" cuando hay múltiples empresas
- Diseño responsive que oculta indicador en móviles

**UX Implementada:**
- En desktop: Muestra empresa claramente sin ser invasivo
- En móvil: Mantiene enfoque en usuario, empresa disponible en menú
- Transiciones suaves y feedback visual

### 3. Breadcrumbs Component
**Ubicación:** `src/app/shared/components/breadcrumbs/breadcrumbs.component.ts`

**Características:**
- Muestra contexto de empresa al inicio de la navegación
- Breadcrumbs automáticos basados en rutas
- Badge con ID de empresa siempre visible
- Diseño limpio y profesional

### 4. EmpresaSelector Component
**Ubicación:** `src/app/shared/components/empresa-selector/empresa-selector.component.ts`

Componente reutilizable para cambiar de empresa desde cualquier parte de la aplicación.

**Uso:**
```html
<!-- En cualquier template -->
<app-empresa-selector (empresaChanged)="onEmpresaChanged($event)"></app-empresa-selector>
```

### 5. EmpresaIndicator Component
**Ubicación:** `src/app/shared/components/empresa-indicator/empresa-indicator.component.ts`

Indicador compacto y configurable para mostrar la empresa actual.

**Variantes disponibles:**
```html
<!-- Tamaño pequeño -->
<app-empresa-indicator size="sm" variant="subtle"></app-empresa-indicator>

<!-- Con ID visible -->
<app-empresa-indicator size="md" [showId]="true" variant="prominent"></app-empresa-indicator>

<!-- Tamaño grande para dashboards -->
<app-empresa-indicator size="lg" [showId]="true"></app-empresa-indicator>
```

### 6. Toast Notifications
**Ubicación:** `src/app/shared/components/toast-container/toast-container.component.ts`

Sistema de notificaciones para feedback cuando se cambia de empresa.

## Mejoras en la Experiencia de Usuario

### 1. Flujo de Cambio de Empresa
- **Desde Header:** Click en menú usuario → "Cambiar Empresa" → Página de selección
- **Feedback:** Notificaciones toast informando el cambio
- **Estados:** Loading, success, error con mensajes claros

### 2. Visibilidad de Contexto
- **Desktop:** Indicador central en header + breadcrumbs
- **Móvil:** Información en menú usuario + breadcrumbs
- **Consistencia:** Mismo diseño visual en toda la app

### 3. Navegación Contextual
- **Breadcrumbs:** Siempre muestran empresa actual
- **Rutas:** Protegidas por guard de empresa seleccionada
- **Estado:** Persistente durante la sesión

## Implementación en Páginas Existentes

### Para Listas de Equipos
```typescript
// En equipo-list.component.ts
export class EquipoListComponent implements OnInit {
  private empresaContext = inject(EmpresaContextService);
  
  ngOnInit() {
    // Usar el servicio en lugar de lógica local
    this.empresaContext.validEmpresaId$.subscribe(empresaId => {
      this.loadEquipos(empresaId);
    });
  }
}
```

### Para Formularios
```html
<!-- En formularios importantes -->
<div class="form-header">
  <app-empresa-indicator size="sm" variant="subtle"></app-empresa-indicator>
  <h2>Crear Nuevo Equipo</h2>
</div>
```

### Para Dashboards
```html
<!-- En dashboard principal -->
<div class="dashboard-header">
  <app-empresa-indicator size="lg" [showId]="true" variant="prominent"></app-empresa-indicator>
  <div class="dashboard-stats">
    <!-- Estadísticas específicas de la empresa -->
  </div>
</div>
```

## Ventajas de la Arquitectura

### 1. Centralización
- Un solo servicio gestiona todo el contexto empresarial
- Evita duplicación de lógica
- Facilita mantenimiento

### 2. Reactividad
- Cambios automáticos en toda la app
- Observables para actualizaciones en tiempo real
- Performance optimizada

### 3. Reutilización
- Componentes configurables
- API consistente
- Fácil integración

### 4. UX/UI Profesional
- Diseño no invasivo
- Feedback claro al usuario
- Responsive design

## Consideraciones de Performance

### 1. Lazy Loading
Los componentes de empresa están en SharedModule, se cargan solo cuando se necesitan.

### 2. Observables Optimizados
```typescript
// Usar takeUntil para evitar memory leaks
private destroy$ = new Subject<void>();

ngOnInit() {
  this.empresaContext.selectedEmpresa$
    .pipe(takeUntil(this.destroy$))
    .subscribe(empresa => {
      // Lógica del componente
    });
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 3. Guards Eficientes
El `EmpresaSelectedGuard` hace verificaciones síncronas cuando es posible.

## Próximos Pasos Recomendados

### 1. Agregar Indicadores en Páginas Críticas
- Formularios de creación/edición
- Páginas de reportes
- Configuraciones específicas de empresa

### 2. Personalización por Empresa
```typescript
// Ejemplo: Colores temáticos por empresa
this.empresaContext.selectedEmpresa$.subscribe(empresa => {
  if (empresa.theme) {
    this.applyTheme(empresa.theme);
  }
});
```

### 3. Auditoría y Logging
```typescript
// Ejemplo: Log de cambios de empresa
this.empresaContext.selectedEmpresa$.subscribe(empresa => {
  this.auditService.logEmpresaChange(empresa?.id);
});
```

### 4. Shortcuts de Teclado
Implementar atajos para cambio rápido de empresa (Ctrl+E).

## Migración de Código Existente

Para componentes que ya manejan empresa localmente:

### Antes:
```typescript
export class EquipoListComponent {
  empresaId: number;
  
  ngOnInit() {
    this.empresaId = this.getEmpresaFromStorage();
    this.loadData();
  }
}
```

### Después:
```typescript
export class EquipoListComponent {
  private empresaContext = inject(EmpresaContextService);
  
  ngOnInit() {
    this.empresaContext.validEmpresaId$.subscribe(empresaId => {
      this.loadData(empresaId);
    });
  }
}
```

Esta implementación proporciona una base sólida y escalable para la gestión del contexto empresarial en toda la aplicación TMS.
