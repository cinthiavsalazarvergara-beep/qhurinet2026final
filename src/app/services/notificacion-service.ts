import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notificacion, NotificacionDTO } from '../model/notificacion';
import { toNotificacion } from '../core/mappers';

/** Notificaciones del usuario (campana de la cabecera). */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private url = environment.apiUrl + '/notifications';
  private http: HttpClient = inject(HttpClient);
  private listaCambio = new Subject<Notificacion[]>();

  list(): Observable<NotificacionDTO[]> {
    return this.http.get<NotificacionDTO[]>(this.url);
  }
  read(id: number): Observable<unknown> {
    return this.http.patch(this.url + '/' + id + '/read', {});
  }
  readAll(): Observable<unknown> {
    return this.http.patch(this.url + '/read-all', {});
  }

  setList(listaNueva: Notificacion[]): void {
    this.listaCambio.next(listaNueva);
  }
  getListaCambio(): Observable<Notificacion[]> {
    return this.listaCambio.asObservable();
  }
  actualizarLista(): void {
    this.list().subscribe({
      next: (data) => this.setList(data.map(toNotificacion)),
      error: (err) => console.error('Error actualizando notificaciones', err),
    });
  }
}
