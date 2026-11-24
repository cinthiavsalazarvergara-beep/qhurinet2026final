import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { CrearTicketDTO, FaqDTO, TicketSoporteDTO } from '../model/ticket-soporte';
import { Ticket } from '../model/support';
import { toTicket } from '../core/mappers';

/** Soporte: preguntas frecuentes y tickets. */
@Injectable({ providedIn: 'root' })
export class TicketSoporteService {
  private url = environment.apiUrl;
  private http: HttpClient = inject(HttpClient);
  private listaCambio = new Subject<Ticket[]>();

  faqs(): Observable<FaqDTO[]> {
    return this.http.get<FaqDTO[]>(this.url + '/faqs');
  }
  list(): Observable<TicketSoporteDTO[]> {
    return this.http.get<TicketSoporteDTO[]>(this.url + '/support-tickets');
  }
  insert(ticket: CrearTicketDTO): Observable<TicketSoporteDTO> {
    return this.http.post<TicketSoporteDTO>(this.url + '/support-tickets', ticket);
  }
  uploadEvidence(id: number, file: File): Observable<unknown> {
    const form = new FormData();
    form.append('archivo', file);
    return this.http.post(this.url + '/support-tickets/' + id + '/evidence', form);
  }

  setList(listaNueva: Ticket[]): void {
    this.listaCambio.next(listaNueva);
  }
  getListaCambio(): Observable<Ticket[]> {
    return this.listaCambio.asObservable();
  }
  actualizarLista(): void {
    this.list().subscribe({
      next: (data) => this.setList(data.map(toTicket)),
      error: (err) => console.error('Error actualizando tickets', err),
    });
  }
}
