import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Texto del buscador de la cabecera. El mapa lo escucha para filtrar anuncios y
 * puntos, y también lo cambia (al abrir una parada) para que la cabecera lo muestre.
 */
@Injectable({ providedIn: 'root' })
export class BusquedaService {
  private textoCambio = new Subject<string>();
  /** Último texto buscado (para quien se suscribe después). */
  texto = '';

  setTexto(texto: string): void {
    this.texto = texto;
    this.textoCambio.next(texto);
  }
  getTextoCambio(): Observable<string> {
    return this.textoCambio.asObservable();
  }
}
