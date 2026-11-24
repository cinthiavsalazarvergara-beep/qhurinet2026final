import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Delivery } from '../../model/delivery';
import { Contraparte } from '../../model/chat';

/** Panel derecho del chat: entrega en curso, código / QR de entrega y reputación de la contraparte. */
@Component({
  selector: 'app-panel-entrega-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './panel-entrega-component.html',
  styleUrl: './panel-entrega-component.css',
})
export class PanelEntregaComponent {
  @Input() entrega: Delivery | null = null;
  @Input() contraparte: Contraparte | null = null;
  @Input() puedeSeguir = false;
  @Input() puedeMostrarCodigo = false;
  @Input() puedeEscanear = false;
  @Input() codigo = '';

  @Output() seguir = new EventEmitter<void>();
  @Output() mostrarCodigo = new EventEmitter<void>();
  @Output() escanear = new EventEmitter<void>();
  @Output() reportar = new EventEmitter<void>();
}
