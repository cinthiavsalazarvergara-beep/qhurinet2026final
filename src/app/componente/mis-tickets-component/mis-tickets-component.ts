import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Ticket, TICKET_STATES } from '../../model/support';
import { TicketSoporteService } from '../../services/ticket-soporte-service';

/** Tarjeta «Mis tickets»: se actualiza cada vez que se crea un ticket nuevo. */
@Component({
  selector: 'app-mis-tickets-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './mis-tickets-component.html',
  styleUrl: './mis-tickets-component.css',
})
export class MisTicketsComponent implements OnInit, OnDestroy {
  ticketService: TicketSoporteService = inject(TicketSoporteService);
  tickets: Ticket[] = [];
  private suscripcion: Subscription;

  ngOnInit(): void {
    this.suscripcion = this.ticketService.getListaCambio().subscribe((data) => (this.tickets = data));
    this.ticketService.actualizarLista();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  colores(t: Ticket): [string, string] {
    return TICKET_STATES[t.state] ?? TICKET_STATES['Abierto'];
  }

  meta(t: Ticket): string {
    return t.category + (t.evidence ? ' · evidencia: ' + (t.evidenceName || 'adjunta') : '');
  }
}
