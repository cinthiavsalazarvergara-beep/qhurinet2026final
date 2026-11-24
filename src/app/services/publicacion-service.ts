import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, Subject, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CrearPublicacionDTO, MiPublicacionDTO, PublicacionDTO } from '../model/publicacion';
import { Delivery } from '../model/delivery';
import { AdView } from '../model/ad';
import { toPublication } from '../core/mappers';
import { SolicitudService } from './solicitud-service';

/**
 * Publicaciones de material: anuncios del mapa (reciclador) y «mis publicaciones» (generador).
 */
@Injectable({ providedIn: 'root' })
export class PublicacionService {
  private url = environment.apiUrl + '/publications';
  private http: HttpClient = inject(HttpClient);
  private solicitudService: SolicitudService = inject(SolicitudService);
  private listaCambio = new Subject<Delivery[]>();
  private anunciosCambio = new Subject<AdView[]>();

  list(estado?: string): Observable<PublicacionDTO[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<PublicacionDTO[]>(this.url, { params });
  }
  listId(id: number): Observable<PublicacionDTO> {
    return this.http.get<PublicacionDTO>(this.url + '/' + id);
  }
  listMine(): Observable<MiPublicacionDTO[]> {
    return this.http.get<MiPublicacionDTO[]>(this.url + '/mine');
  }
  insert(publicacion: CrearPublicacionDTO): Observable<PublicacionDTO> {
    return this.http.post<PublicacionDTO>(this.url, publicacion);
  }
  cancel(id: number, motivo: string): Observable<PublicacionDTO> {
    return this.http.patch<PublicacionDTO>(this.url + '/' + id + '/cancel', { motivo });
  }

  /**
   * Mis publicaciones ya convertidas en filas. «En camino» solo lo sabe la solicitud,
   * así que se consulta el detalle de las publicaciones reservadas.
   */
  listMineRows(): Observable<Delivery[]> {
    return this.listMine().pipe(
      switchMap((rows) => {
        const reserved = rows.filter((r) => r.estado === 'reservado' && r.solicitudId);
        if (!reserved.length) return of(rows.map((r) => toPublication(r)));
        return forkJoin(reserved.map((r) => this.solicitudService.listId(r.solicitudId!).pipe(
          map((d) => [r.id, d.solicitud.estado] as [number, string]),
          catchError(() => of([r.id, ''] as [number, string])),
        ))).pipe(map((pairs) => {
          const estados = new Map(pairs);
          return rows.map((r) => toPublication(r, estados.get(r.id)));
        }));
      }),
    );
  }

  setList(listaNueva: Delivery[]): void {
    this.listaCambio.next(listaNueva);
  }
  getListaCambio(): Observable<Delivery[]> {
    return this.listaCambio.asObservable();
  }
  actualizarLista(): void {
    this.listMineRows().subscribe({
      next: (data) => this.setList(data),
      error: (err) => console.error('Error actualizando publicaciones', err),
    });
  }

  /** Anuncios visibles en el mapa (los publica el mapa para que la cabecera los cuente). */
  setAnuncios(lista: AdView[]): void {
    this.anunciosCambio.next(lista);
  }
  getAnunciosCambio(): Observable<AdView[]> {
    return this.anunciosCambio.asObservable();
  }
}
