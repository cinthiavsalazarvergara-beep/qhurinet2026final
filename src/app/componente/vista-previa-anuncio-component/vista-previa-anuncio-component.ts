import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconoComponent } from '../icono-component/icono-component';

/** Columna derecha de Publicar: ubicación de recojo y vista previa del anuncio. */
@Component({
  selector: 'app-vista-previa-anuncio-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IconoComponent],
  templateUrl: './vista-previa-anuncio-component.html',
  styleUrl: './vista-previa-anuncio-component.css',
})
export class VistaPreviaAnuncioComponent {
  @Input() direccion = '';
  @Input() distrito = '';
  @Input() nombre = '';
  @Input() kg = '';
  @Input() material = '';
  @Input() icono = 'carton';
  @Input() color = '#eceee7';
  @Input() colorIcono = '#a8b2a2';
  @Input() ventana = '';
  @Input() pago = '';
}
