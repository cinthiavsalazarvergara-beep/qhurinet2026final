import { Injectable } from '@angular/core';
import { SavedRoute } from '../model/ad';

/**
 * Ruta de trabajo del reciclador (paradas y rutas guardadas). Vive en memoria mientras
 * dura la sesión en la consola, para no perderla al cambiar de pantalla. Recojos la usa
 * para quitar la parada de una recolección cancelada o completada.
 * No llama al backend: el cálculo de distancias y la optimización son locales (core/ruta.ts).
 */
@Injectable({ providedIn: 'root' })
export class RutaService {
  /** ids de las paradas en orden («a{publicación}» o «p{punto}»). */
  stops: string[] = [];
  /** La ruta se siembra una sola vez con los anuncios ya reclamados. */
  seeded = false;
  savedRoutes: SavedRoute[] = [];
  private nextRouteId = 1;

  newRouteId(): string {
    return 'ruta-' + this.nextRouteId++;
  }

  removeStop(id: string): void {
    this.stops = this.stops.filter((s) => s !== id);
  }

  /** Vacía la ruta del usuario anterior (al entrar a la consola). */
  reset(): void {
    this.stops = [];
    this.seeded = false;
    this.savedRoutes = [];
  }
}
