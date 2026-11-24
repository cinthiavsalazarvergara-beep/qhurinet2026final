import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HistorialDTO, ReporteMaterialDTO, ResumenReporteDTO } from '../model/reporte';

/** Reportes del mes (END-41, END-42), historial y exportación (END-44). */
@Injectable({ providedIn: 'root' })
export class ReporteService {
  private url = environment.apiUrl;
  private http: HttpClient = inject(HttpClient);

  summary(desde: string, hasta: string): Observable<ResumenReporteDTO> {
    return this.http.get<ResumenReporteDTO>(this.url + '/reports/summary', { params: { desde, hasta } });
  }
  materials(desde: string, hasta: string): Observable<ReporteMaterialDTO[]> {
    return this.http.get<ReporteMaterialDTO[]>(this.url + '/reports/materials', { params: { desde, hasta } });
  }
  history(): Observable<HistorialDTO[]> {
    return this.http.get<HistorialDTO[]>(this.url + '/history');
  }
  exportHistory(formato: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(this.url + '/reports/export', { params: { formato }, responseType: 'blob' });
  }
}
