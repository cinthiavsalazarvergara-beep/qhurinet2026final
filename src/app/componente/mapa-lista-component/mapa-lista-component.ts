import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AnuncioMapa, ChipFiltro } from '../../model/ad';
import { PuntoMapa } from '../../model/point';
import { IconoComponent } from '../icono-component/icono-component';

/** Columna izquierda del mapa: vista (anuncios/puntos), filtros y tarjetas de resultados. */
@Component({
  selector: 'app-mapa-lista-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IconoComponent],
  templateUrl: './mapa-lista-component.html',
  styleUrl: './mapa-lista-component.css',
})
export class MapaListaComponent {
  @Input() vistas: ChipFiltro[] = [];
  @Input() filtros: ChipFiltro[] = [];
  @Input() tiposPunto: ChipFiltro[] = [];
  @Input() esPuntos = false;
  @Input() anuncios: AnuncioMapa[] = [];
  @Input() puntos: PuntoMapa[] = [];
  @Input() resultado = '';
  @Input() vacio = false;
  @Input() mensajeVacio = '';
  @Input() error = '';

  @Output() chip = new EventEmitter<ChipFiltro>();
  @Output() limpiar = new EventEmitter<void>();
  @Output() reclamar = new EventEmitter<string>();
  @Output() chat = new EventEmitter<void>();
  @Output() punto = new EventEmitter<string>();
}
