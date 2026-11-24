import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { switchMap } from 'rxjs';
import { PAY_KINDS } from '../../model/profile';
import { MetodoPagoUsuarioDTO, PerfilUsuarioDTO } from '../../model/perfil-usuario';
import { PerfilService } from '../../services/perfil-service';
import { errorMessage } from '../../core/http-error';

/** Modal «Agregar método de pago»: Yape, Plin, tarjeta, transferencia o efectivo. */
@Component({
  selector: 'app-metodo-pago-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, A11yModule],
  templateUrl: './metodo-pago-dialog-component.html',
  styleUrl: './metodo-pago-dialog-component.css',
})
export class MetodoPagoDialogComponent {
  /** Métodos actuales del usuario (se envía la lista completa al guardar). */
  @Input() metodos: MetodoPagoUsuarioDTO[] = [];
  /** Se emite con el perfil actualizado. */
  @Output() guardado = new EventEmitter<PerfilUsuarioDTO>();
  @Output() cerrar = new EventEmitter<void>();

  fb: FormBuilder = inject(FormBuilder);
  perfilService: PerfilService = inject(PerfilService);

  readonly tipos = Object.keys(PAY_KINDS).map((k) => ({ key: k, label: PAY_KINDS[k].label }));
  tipo = 'yape';
  predeterminado = true;
  error = '';
  form: FormGroup = this.fb.group({ dato: [''] });

  info() {
    return PAY_KINDS[this.tipo];
  }

  seleccionar(k: string): void {
    this.tipo = k;
    this.error = '';
    this.form.reset({ dato: '' });
  }

  guardar(): void {
    const kind = this.info();
    const raw = String(this.form.value.dato ?? '').trim();
    const digits = raw.replace(/^\+?51/, '').replace(/\D/g, '');
    if (kind.field && !raw) { this.error = 'Completa el campo ' + kind.field.toLowerCase() + '.'; return; }
    if (this.tipo === 'tarjeta' && !/^\d{4}$/.test(raw)) { this.error = 'Ingresa los últimos 4 dígitos de la tarjeta.'; return; }
    if (['yape', 'plin'].includes(this.tipo) && !/^\d{9}$/.test(digits)) { this.error = 'Ingresa un celular de 9 dígitos.'; return; }
    if (this.tipo === 'transferencia' && !/^\d{20}$/.test(raw.replace(/\D/g, ''))) { this.error = 'El CCI debe tener 20 dígitos.'; return; }
    const dato = this.tipo === 'efectivo' ? null
      : ['yape', 'plin'].includes(this.tipo) ? digits
      : this.tipo === 'transferencia' ? raw.replace(/\D/g, '') : raw;
    const otros = this.metodos.filter((m) => m.tipo !== this.tipo);
    const esPredeterminado = this.predeterminado || otros.length === 0;
    const lista: MetodoPagoUsuarioDTO[] = [
      ...otros.map((m) => ({ id: m.id, tipo: m.tipo, dato: m.dato, predeterminado: esPredeterminado ? false : !!m.predeterminado })),
      { id: null, tipo: this.tipo, dato, predeterminado: esPredeterminado },
    ];
    this.perfilService.savePaymentMethods(lista).pipe(switchMap(() => this.perfilService.me())).subscribe({
      next: (p) => this.guardado.emit(p),
      error: (e) => (this.error = errorMessage(e)),
    });
  }
}
