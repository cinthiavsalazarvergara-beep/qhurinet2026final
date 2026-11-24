import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { PayMethodView } from '../../model/profile';

/** Tarjeta «Métodos de pago» del perfil. */
@Component({
  selector: 'app-metodos-pago-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './metodos-pago-component.html',
  styleUrl: './metodos-pago-component.css',
})
export class MetodosPagoComponent {
  @Input() metodos: PayMethodView[] = [];
  @Output() usar = new EventEmitter<string>();
  @Output() agregar = new EventEmitter<void>();
}
