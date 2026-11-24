import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Marca de QhuriNet: anillo abierto que se lee como «Q» y como ciclo de
 * reciclaje, con el nodo de red arriba. Trazo idéntico al del prototipo.
 */
@Component({
  selector: 'app-logo-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './logo-component.html',
  styleUrl: './logo-component.css',
})
export class LogoComponent {
  @Input() size = 40;
}
