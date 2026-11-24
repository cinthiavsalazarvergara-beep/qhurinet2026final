import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ParadaRuta } from '../../model/ad';

/** Panel «Ruta activa» del mapa: kilos, distancia, tiempo y paradas en orden. */
@Component({
  selector: 'app-ruta-activa-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './ruta-activa-component.html',
  styleUrl: './ruta-activa-component.css',
})
export class RutaActivaComponent {
  @Input() kg = '';
  @Input() meta = '';
  @Input() distancia = '';
  @Input() minutos = 0;
  @Input() aviso = '';
  @Input() paradas: ParadaRuta[] = [];
  @Input() puedeEscanear = false;

  @Output() abrirParada = new EventEmitter<string>();
  @Output() quitarParada = new EventEmitter<string>();
  @Output() escanear = new EventEmitter<void>();
  @Output() chat = new EventEmitter<void>();
}
