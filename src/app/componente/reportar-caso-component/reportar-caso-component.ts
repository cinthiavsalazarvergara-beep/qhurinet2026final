import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of, switchMap } from 'rxjs';
import { REPORT_CATEGORIES, ticketCategoryValue } from '../../model/support';
import { TicketSoporteService } from '../../services/ticket-soporte-service';
import { readFile } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';

/** Tarjeta «Reportar un caso»: categoría, descripción y evidencia opcional (crea un ticket). */
@Component({
  selector: 'app-reportar-caso-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule],
  templateUrl: './reportar-caso-component.html',
  styleUrl: './reportar-caso-component.css',
})
export class ReportarCasoComponent {
  fb: FormBuilder = inject(FormBuilder);
  ticketService: TicketSoporteService = inject(TicketSoporteService);

  readonly categorias = REPORT_CATEGORIES;
  categoria = REPORT_CATEGORIES[0];
  form: FormGroup = this.fb.group({ texto: ['', [Validators.required, Validators.maxLength(500)]] });
  nombreArchivo = '';
  error = '';
  aviso = '';
  private archivo: File | null = null;

  onArchivo(event: Event): void {
    readFile(event.target as HTMLInputElement, (nombre, _url, file) => {
      this.nombreArchivo = nombre;
      this.archivo = file;
    });
  }

  quitarArchivo(): void {
    this.nombreArchivo = '';
    this.archivo = null;
  }

  enviar(): void {
    const texto = String(this.form.value.texto ?? '').trim();
    if (!texto) {
      this.error = 'Cuéntanos qué pasó antes de enviar el reporte.';
      return;
    }
    const archivo = this.archivo;
    this.ticketService.insert({ categoria: ticketCategoryValue(this.categoria), asunto: texto.slice(0, 80), descripcion: texto }).pipe(
      switchMap((t) => (archivo ? this.ticketService.uploadEvidence(t.id, archivo).pipe(map(() => t), catchError(() => of(t))) : of(t))),
    ).subscribe({
      next: (t) => {
        this.form.reset({ texto: '' });
        this.quitarArchivo();
        this.error = '';
        this.aviso = 'Ticket #' + t.id + ' creado. Te responderemos pronto.';
        this.ticketService.actualizarLista();
      },
      error: (e) => (this.error = errorMessage(e)),
    });
  }
}
