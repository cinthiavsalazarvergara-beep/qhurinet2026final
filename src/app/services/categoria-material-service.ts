import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoriaMaterialDTO, ClasificacionMaterialDTO } from '../model/categoria-material';

/** Catálogo de categorías de material y clasificación con IA (Gemini). */
@Injectable({ providedIn: 'root' })
export class CategoriaMaterialService {
  private url = environment.apiUrl + '/material-categories';
  private http: HttpClient = inject(HttpClient);

  list(): Observable<CategoriaMaterialDTO[]> {
    return this.http.get<CategoriaMaterialDTO[]>(this.url);
  }

  /** Clasifica por descripción y/o foto (POST /materials/classify, multipart). */
  clasificar(descripcion: string, foto: File | null): Observable<ClasificacionMaterialDTO> {
    const form = new FormData();
    if (descripcion) form.append('descripcion', descripcion);
    if (foto) form.append('foto', foto);
    return this.http.post<ClasificacionMaterialDTO>(environment.apiUrl + '/materials/classify', form);
  }
}
