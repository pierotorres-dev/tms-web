import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

/**
 * Directiva que detecta clics fuera de un elemento y emite un evento
 * Útil para cerrar menús desplegables, modales, etc.
 */
@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) { }

  @HostListener('document:click', ['$event.target'])
  onClick(target: any): void {
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
