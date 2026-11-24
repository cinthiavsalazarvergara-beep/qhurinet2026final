import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { VerificationDoc } from '../../model/profile';

/** Tarjeta «Verificación» del perfil: documentos y su estado. */
@Component({
  selector: 'app-verificacion-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './verificacion-component.html',
  styleUrl: './verificacion-component.css',
})
export class VerificacionComponent {
  @Input() documentos: VerificationDoc[] = [];
  @Output() abrir = new EventEmitter<void>();

  aprobados(): number {
    return this.documentos.filter((d) => d.state === 'Aprobado').length;
  }
}
