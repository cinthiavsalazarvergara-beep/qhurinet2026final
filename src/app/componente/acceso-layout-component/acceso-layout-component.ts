import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LogoComponent } from '../logo-component/logo-component';

/**
 * Marco de la pantalla de acceso: panel izquierdo oscuro con la marca y el lema,
 * y a la derecha el formulario (login o registro) proyectado por el router.
 */
@Component({
  selector: 'app-acceso-layout-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, LogoComponent],
  templateUrl: './acceso-layout-component.html',
  styleUrl: './acceso-layout-component.css',
})
export class AccesoLayoutComponent {}
