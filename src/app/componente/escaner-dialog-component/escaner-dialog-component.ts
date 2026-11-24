import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Delivery } from '../../model/delivery';
import { SolicitudService } from '../../services/solicitud-service';
import { canScan, isClosed } from '../../core/entregas';
import { errorMessage } from '../../core/http-error';

/**
 * Modal «Confirmar entrega» (escáner QR). Sin cámara: el reciclador escribe el código
 * que le dicta el generador y se valida contra el servidor (validate-qr + confirm).
 */
@Component({
  selector: 'app-escaner-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, A11yModule],
  templateUrl: './escaner-dialog-component.html',
  styleUrl: './escaner-dialog-component.css',
})
export class EscanerDialogComponent {
  @Input() entrega: Delivery;
  /** Se emite con la entrega ya confirmada. */
  @Output() confirmado = new EventEmitter<Delivery>();
  @Output() cerrar = new EventEmitter<void>();

  fb: FormBuilder = inject(FormBuilder);
  solicitudService: SolicitudService = inject(SolicitudService);

  form: FormGroup = this.fb.group({ codigo: [''] });
  error = '';

  bloqueada(): boolean {
    return isClosed(this.entrega);
  }

  titulo(): string {
    return (this.entrega.place ?? '') + ' · ' + this.entrega.kg;
  }

  confirmar(): void {
    const row = this.entrega;
    if (!row.requestId || !canScan(row)) return;
    // El back emite un UUID en minúsculas y lo compara sensible a mayúsculas: se envía en minúsculas.
    const codigo = String(this.form.value.codigo ?? '').trim().toLowerCase();
    if (!codigo) {
      this.error = 'Ingresa el código de entrega que te muestra el generador.';
      return;
    }
    const id = row.requestId;
    this.solicitudService.validateQr(id, codigo).subscribe({
      next: () => {
        this.solicitudService.confirm(id, codigo).subscribe({
          next: () => this.confirmado.emit(row),
          error: (e) => this.mostrarError(e),
        });
      },
      error: (e) => this.mostrarError(e),
    });
  }

  private mostrarError(e: unknown): void {
    const status = (e as { status?: number })?.status;
    this.error = status === 409 || status === 400
      ? 'El código no corresponde a esta entrega. Revisa el código que muestra el generador.'
      : errorMessage(e);
  }
}
