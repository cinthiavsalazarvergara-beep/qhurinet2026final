import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Delivery } from '../../model/delivery';
import { SolicitudService } from '../../services/solicitud-service';
import { errorMessage } from '../../core/http-error';

/**
 * Modal «Entrega confirmada». El generador valora al reciclador (1–5 y comentario,
 * POST /rating); el reciclador solo ve que la entrega quedó registrada.
 */
@Component({
  selector: 'app-valorar-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, A11yModule],
  templateUrl: './valorar-dialog-component.html',
  styleUrl: './valorar-dialog-component.css',
})
export class ValorarDialogComponent {
  @Input() entrega: Delivery;
  @Input() esGenerador = false;
  @Output() cerrar = new EventEmitter<void>();

  fb: FormBuilder = inject(FormBuilder);
  solicitudService: SolicitudService = inject(SolicitudService);

  form: FormGroup = this.fb.group({ comentario: [''] });
  rating = 0;
  readonly estrellas = [1, 2, 3, 4, 5];
  error = '';

  titulo(): string {
    return this.entrega ? this.entrega.kg + ' de ' + this.entrega.material + ' recuperados' : 'Entrega confirmada';
  }

  setRating(n: number): void {
    this.rating = n;
  }

  enviar(): void {
    const row = this.entrega;
    if (!this.esGenerador || !row?.requestId || this.rating === 0) {
      this.cerrar.emit();
      return;
    }
    const comentario = String(this.form.value.comentario ?? '').trim().slice(0, 240);
    this.solicitudService.rate(row.requestId, this.rating, comentario).subscribe({
      next: () => this.cerrar.emit(),
      error: (e) => (this.error = errorMessage(e)),
    });
  }
}
