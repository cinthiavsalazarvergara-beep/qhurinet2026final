import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Íconos SVG de la app (navegación, materiales y tipos de punto) dibujados en la
 * plantilla con @switch. Reemplaza al pipe safeHtml + [innerHTML]: el SVG es parte
 * de la plantilla, así que no hace falta saltarse la sanitización de Angular.
 * Usan currentColor: toman el color del elemento padre.
 */
@Component({
  selector: 'app-icono-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './icono-component.html',
  styleUrl: './icono-component.css',
})
export class IconoComponent {
  @Input() nombre = '';
}
