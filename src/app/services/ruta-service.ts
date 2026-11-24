import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SavedRoute } from '../model/ad';

/** Respuesta de POST /routes/optimize (OSRM en el back). */
export interface RutaOptimizadaDTO {
  paradas: { puntoReciclajeId: number; orden: number }[];
  distanciaTotalKm: number;
  tiempoEstimadoMin: number;
}

/** Origen de la ruta: el back exige coordenadas reales. Se usa el centro de Lima. */
export const ORIGEN_RUTA = { latitudOrigen: -12.0464, longitudOrigen: -77.0428 };

/**
 * Ruta de trabajo del reciclador (paradas y rutas guardadas). Vive en memoria mientras
 * dura la sesión en la consola, para no perderla al cambiar de pantalla. Recojos la usa
 * para quitar la parada de una recolección cancelada o completada.
 * La optimización de los puntos de reciclaje la hace el back con OSRM (POST /routes/optimize).
 */
@Injectable({ providedIn: 'root' })
export class RutaService {
  private http: HttpClient = inject(HttpClient);

  /** ids de las paradas en orden («a{publicación}» o «p{punto}»). */
  stops: string[] = [];
  /** La ruta se siembra una sola vez con los anuncios ya reclamados. */
  seeded = false;
  savedRoutes: SavedRoute[] = [];
  private nextRouteId = 1;

  /** Ordena los puntos con OSRM. El back solo acepta ids de puntos de reciclaje. */
  optimizar(puntosIds: number[]): Observable<RutaOptimizadaDTO> {
    return this.http.post<RutaOptimizadaDTO>(environment.apiUrl + '/routes/optimize', { ...ORIGEN_RUTA, puntosIds });
  }

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
