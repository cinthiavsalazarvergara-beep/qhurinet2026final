import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { PuntoReciclajeDTO } from '../model/punto-reciclaje';
import { RecyclingPoint } from '../model/point';
import { toPoint } from '../core/mappers';

/** Puntos fijos de reciclaje del mapa. */
@Injectable({ providedIn: 'root' })
export class PuntoReciclajeService {
  private url = environment.apiUrl + '/recycling-points';
  private http: HttpClient = inject(HttpClient);
  private listaCambio = new Subject<RecyclingPoint[]>();

  list(): Observable<PuntoReciclajeDTO[]> {
    return this.http.get<PuntoReciclajeDTO[]>(this.url);
  }

  setList(listaNueva: RecyclingPoint[]): void {
    this.listaCambio.next(listaNueva);
  }
  getListaCambio(): Observable<RecyclingPoint[]> {
    return this.listaCambio.asObservable();
  }
  actualizarLista(): void {
    this.list().subscribe({
      next: (data) => this.setList(data.map((p) => toPoint(p))),
      error: (err) => console.error('Error actualizando puntos', err),
    });
  }
}
