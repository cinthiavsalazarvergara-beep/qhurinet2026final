import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FaqDTO } from '../../model/ticket-soporte';
import { TicketSoporteService } from '../../services/ticket-soporte-service';
import { ReportarCasoComponent } from '../reportar-caso-component/reportar-caso-component';
import { MisTicketsComponent } from '../mis-tickets-component/mis-tickets-component';

/** Pantalla Soporte (ambos roles): preguntas frecuentes, llamada, reporte y tickets. */
@Component({
  selector: 'app-soporte-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReportarCasoComponent, MisTicketsComponent],
  templateUrl: './soporte-component.html',
  styleUrl: './soporte-component.css',
})
export class SoporteComponent implements OnInit {
  ticketService: TicketSoporteService = inject(TicketSoporteService);

  faqs: FaqDTO[] = [];
  /** Preguntas abiertas (la primera arranca abierta). */
  abiertas: Record<number, boolean> = { 0: true };

  ngOnInit(): void {
    this.ticketService.faqs().subscribe({
      next: (data) => (this.faqs = data),
      error: (err) => console.error('Error cargando preguntas frecuentes', err),
    });
  }

  toggleFaq(i: number): void {
    this.abiertas = { ...this.abiertas, [i]: !this.abiertas[i] };
  }
}
