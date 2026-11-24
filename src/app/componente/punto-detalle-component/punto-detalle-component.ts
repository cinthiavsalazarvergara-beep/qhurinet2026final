import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { PuntoMapa } from '../../model/point';
import { IconoComponent } from '../icono-component/icono-component';

/** Panel lateral con el detalle de un punto de reciclaje y el botón «Agregar a ruta». */
@Component({
  selector: 'app-punto-detalle-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IconoComponent],
  templateUrl: './punto-detalle-component.html',
  styleUrl: './punto-detalle-component.css',
})
export class PuntoDetalleComponent {
  @Input() punto: PuntoMapa;
  @Output() cerrar = new EventEmitter<void>();
  @Output() agregar = new EventEmitter<string>();
}
