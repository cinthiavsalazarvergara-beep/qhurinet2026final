import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Notificacion } from '../../model/notificacion';

/** Panel desplegable de notificaciones de la cabecera. */
@Component({
  selector: 'app-notificaciones-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './notificaciones-component.html',
  styleUrl: './notificaciones-component.css',
})
export class NotificacionesComponent {
  @Input() notificaciones: Notificacion[] = [];
  @Output() marcar = new EventEmitter<string>();
  @Output() marcarTodas = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  sinLeer(): number {
    return this.notificaciones.filter((n) => !n.read).length;
  }
}
