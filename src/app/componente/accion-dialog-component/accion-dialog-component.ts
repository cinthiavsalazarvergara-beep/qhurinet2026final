import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Observable } from 'rxjs';
import { Delivery, DeliveryAction, rowRole, SLOT_OPTIONS, TIME_SLOTS } from '../../model/delivery';
import { SolicitudService } from '../../services/solicitud-service';
import { PublicacionService } from '../../services/publicacion-service';
import { RutaService } from '../../services/ruta-service';
import { isClosed } from '../../core/entregas';
import { todayDate, validDate } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';

/** Modal de acciones de fila: coordinar, reprogramar o cancelar una recolección. */
@Component({
  selector: 'app-accion-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, A11yModule],
  templateUrl: './accion-dialog-component.html',
  styleUrl: './accion-dialog-component.css',
})
export class AccionDialogComponent implements OnInit {
  @Input() entrega: Delivery;
  @Input() tipo: DeliveryAction = 'reprogramar';
  /** Fecha y franja precargadas (deep link ?date=&slot=). */
  @Input() fechaInicial = '';
  @Input() franjaInicial = '';
  @Output() completado = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  fb: FormBuilder = inject(FormBuilder);
  solicitudService: SolicitudService = inject(SolicitudService);
  publicacionService: PublicacionService = inject(PublicacionService);
  rutaService: RutaService = inject(RutaService);

  form: FormGroup;
  error = '';
  readonly hoy = todayDate();
  readonly franjas = SLOT_OPTIONS;

  ngOnInit(): void {
    const franja = this.franjaInicial || this.entrega.slot || '';
    this.form = this.fb.group({
      fecha: [this.fechaInicial || this.entrega.date || '', Validators.required],
      franja: [TIME_SLOTS.includes(franja) ? franja : TIME_SLOTS[0], Validators.required],
      motivo: ['', Validators.required],
    });
  }

  titulo(): string {
    if (this.tipo === 'cancelar') return 'Cancelar recolección';
    if (this.tipo === 'coordinar') return 'Coordinar recolección';
    return 'Reprogramar recolección';
  }

  bloqueada(): boolean {
    return isClosed(this.entrega);
  }

  confirmar(): void {
    const row = this.entrega;
    if (this.bloqueada()) return;
    if (this.tipo === 'cancelar') {
      this.cancelar(row);
      return;
    }
    if (!row.requestId) return;
    const fecha: string = this.form.value.fecha;
    const franja: string = this.form.value.franja;
    if (!validDate(fecha) || fecha < this.hoy) {
      this.error = 'Elige una fecha válida desde hoy.';
      return;
    }
    if (!TIME_SLOTS.includes(franja)) {
      this.error = 'Elige una franja horaria.';
      return;
    }
    const cuando = fecha + 'T00:00:00';
    const llamada: Observable<unknown> = this.tipo === 'coordinar'
      ? this.solicitudService.coordinate(row.requestId, cuando, franja)
      : this.solicitudService.reschedule(row.requestId, cuando, franja);
    llamada.subscribe({
      next: () => this.completado.emit(),
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  private cancelar(row: Delivery): void {
    const motivo = String(this.form.value.motivo ?? '').trim();
    if (!motivo) {
      this.error = 'Indica el motivo de la cancelación.';
      return;
    }
    // El generador cancela su publicación (aunque nadie la haya reclamado); el reciclador cancela su recolección.
    let llamada: Observable<unknown>;
    if (rowRole(row.id) === 'generador' && row.publicationId) {
      llamada = this.publicacionService.cancel(row.publicationId, motivo.slice(0, 240));
    } else if (row.requestId) {
      llamada = this.solicitudService.cancel(row.requestId, motivo.slice(0, 240));
    } else {
      return;
    }
    llamada.subscribe({
      next: () => {
        this.rutaService.removeStop('a' + row.publicationId);
        this.completado.emit();
      },
      error: (e) => (this.error = errorMessage(e)),
    });
  }
}
