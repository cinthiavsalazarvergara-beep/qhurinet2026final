import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoriaMaterialDTO } from '../model/categoria-material';

/** Catálogo de categorías de material. */
@Injectable({ providedIn: 'root' })
export class CategoriaMaterialService {
  private url = environment.apiUrl + '/material-categories';
  private http: HttpClient = inject(HttpClient);

  list(): Observable<CategoriaMaterialDTO[]> {
    return this.http.get<CategoriaMaterialDTO[]>(this.url);
  }
}
