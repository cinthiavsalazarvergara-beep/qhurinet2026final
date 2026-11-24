import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RutaGuardadaVista } from '../../model/ad';

/** Panel lateral «Rutas guardadas»: cargar o eliminar una ruta. */
@Component({
  selector: 'app-rutas-guardadas-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './rutas-guardadas-component.html',
  styleUrl: './rutas-guardadas-component.css',
})
export class RutasGuardadasComponent {
  @Input() rutas: RutaGuardadaVista[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @Output() cargar = new EventEmitter<RutaGuardadaVista>();
  @Output() eliminar = new EventEmitter<RutaGuardadaVista>();
}
