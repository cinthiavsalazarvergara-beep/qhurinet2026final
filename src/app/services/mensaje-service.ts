import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MensajeDTO } from '../model/mensaje';

/** Chat de una solicitud de recolección. */
@Injectable({ providedIn: 'root' })
export class MensajeService {
  private url = environment.apiUrl + '/collection-requests';
  private http: HttpClient = inject(HttpClient);

  list(solicitudId: number): Observable<MensajeDTO[]> {
    return this.http.get<MensajeDTO[]>(this.url + '/' + solicitudId + '/messages');
  }
  insert(solicitudId: number, contenido: string): Observable<MensajeDTO> {
    return this.http.post<MensajeDTO>(this.url + '/' + solicitudId + '/messages', { contenido });
  }
}
