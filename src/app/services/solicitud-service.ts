import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { CodigoQrDTO, DetalleSolicitudDTO, MiSolicitudDTO, SeguimientoDTO, SolicitudDTO } from '../model/solicitud';
import { Delivery } from '../model/delivery';
import { toPickup } from '../core/mappers';

/**
 * Solicitudes de recolección (recojos del reciclador). La lista de recojos se comparte
 * con el mapa, los chats y la cabecera mediante `getListaCambio()`.
 */
@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private url = environment.apiUrl + '/collection-requests';
  private http: HttpClient = inject(HttpClient);
  private listaCambio = new Subject<Delivery[]>();

  list(): Observable<MiSolicitudDTO[]> {
    return this.http.get<MiSolicitudDTO[]>(this.url);
  }
  listId(id: number): Observable<DetalleSolicitudDTO> {
    return this.http.get<DetalleSolicitudDTO>(this.url + '/' + id);
  }
  /** Reclama un anuncio: crea la solicitud en estado «creada». */
  insert(publicacionId: number): Observable<SolicitudDTO> {
    return this.http.post<SolicitudDTO>(this.url, { publicacionId });
  }
  coordinate(id: number, fechaCoordinada: string, franjaHoraria: string): Observable<SolicitudDTO> {
    return this.http.patch<SolicitudDTO>(this.url + '/' + id + '/coordinate', { fechaCoordinada, franjaHoraria });
  }
  reschedule(id: number, fechaCoordinada: string, franjaHoraria: string): Observable<SolicitudDTO> {
    return this.http.patch<SolicitudDTO>(this.url + '/' + id + '/reschedule', { fechaCoordinada, franjaHoraria });
  }
  cancel(id: number, motivo: string): Observable<SolicitudDTO> {
    return this.http.patch<SolicitudDTO>(this.url + '/' + id + '/cancel', { motivo });
  }
  setPriority(id: number, prioritaria: boolean): Observable<SolicitudDTO> {
    return this.http.patch<SolicitudDTO>(this.url + '/' + id + '/priority', { prioritaria });
  }
  start(id: number): Observable<SolicitudDTO> {
    return this.http.patch<SolicitudDTO>(this.url + '/' + id + '/start', {});
  }
  qr(id: number): Observable<CodigoQrDTO> {
    return this.http.get<CodigoQrDTO>(this.url + '/' + id + '/qr');
  }
  validateQr(id: number, codigo: string): Observable<unknown> {
    return this.http.post(this.url + '/' + id + '/validate-qr', { codigo });
  }
  confirm(id: number, codigo: string): Observable<SolicitudDTO> {
    return this.http.post<SolicitudDTO>(this.url + '/' + id + '/confirm', { codigo });
  }
  rate(id: number, calificacion: number, comentario = ''): Observable<unknown> {
    return this.http.post(this.url + '/' + id + '/rating', { calificacion, comentario });
  }
  tracking(id: number): Observable<SeguimientoDTO> {
    return this.http.get<SeguimientoDTO>(this.url + '/' + id + '/tracking');
  }

  setList(listaNueva: Delivery[]): void {
    this.listaCambio.next(listaNueva); // envía la nueva lista a los suscriptores
  }
  getListaCambio(): Observable<Delivery[]> {
    return this.listaCambio.asObservable();
  }
  actualizarLista(): void {
    this.list().subscribe({
      next: (data) => this.setList(data.map(toPickup)),
      error: (err) => console.error('Error actualizando recojos', err),
    });
  }
}
