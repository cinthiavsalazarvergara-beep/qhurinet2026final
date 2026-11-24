import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocumentoVerificacionDTO } from '../model/documento';
import { VerificationDoc } from '../model/profile';
import { toDocumento } from '../core/mappers';

/** Documentos de verificación del usuario. */
@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private url = environment.apiUrl + '/users/me/documents';
  private http: HttpClient = inject(HttpClient);
  private listaCambio = new Subject<VerificationDoc[]>();

  list(): Observable<DocumentoVerificacionDTO[]> {
    return this.http.get<DocumentoVerificacionDTO[]>(this.url);
  }
  insert(tipo: string, file: File): Observable<DocumentoVerificacionDTO> {
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('archivo', file);
    return this.http.post<DocumentoVerificacionDTO>(this.url, form);
  }

  setList(listaNueva: VerificationDoc[]): void {
    this.listaCambio.next(listaNueva);
  }
  getListaCambio(): Observable<VerificationDoc[]> {
    return this.listaCambio.asObservable();
  }
  actualizarLista(): void {
    this.list().subscribe({
      next: (data) => this.setList(data.map(toDocumento)),
      error: (err) => console.error('Error actualizando documentos', err),
    });
  }
}
