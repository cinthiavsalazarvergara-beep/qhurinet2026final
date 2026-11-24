import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { Delivery } from '../../model/delivery';
import { IconoComponent } from '../icono-component/icono-component';

/**
 * Modal «Seguimiento del recolector»: marcador que avanza con ETA simulada.
 * El recorrido es dibujado; no hay geolocalización.
 */
@Component({
  selector: 'app-seguimiento-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [A11yModule, IconoComponent],
  templateUrl: './seguimiento-dialog-component.html',
  styleUrl: './seguimiento-dialog-component.css',
})
export class SeguimientoDialogComponent implements OnInit, OnDestroy {
  @Input() entrega: Delivery;
  @Output() cerrar = new EventEmitter<void>();

  progreso = 0;
  private inicio = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.inicio = Date.now();
    this.timer = setInterval(() => {
      this.progreso = Math.min(100, (Date.now() - this.inicio) / 600);
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  marcadorLeft(): number {
    return 15 + 65 * (this.progreso / 100);
  }
  marcadorTop(): number {
    return 80 - 55 * (this.progreso / 100);
  }
  eta(): number {
    return Math.ceil(18 * (1 - this.progreso / 100));
  }
  estado(): string {
    return this.progreso >= 100 ? 'El recolector llegó a tu dirección' : 'En camino';
  }
}
