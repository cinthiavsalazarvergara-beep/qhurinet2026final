import { ROUTE_ORIGIN, RouteLocation } from '../model/ad';

// Cálculo LOCAL de la ruta del reciclador sobre el lienzo dibujado del mapa.
// No llama a ningún servicio externo: la optimización es «vecino más cercano».
// 1 unidad del dibujo = 80 m, velocidad media 15 km/h y 3 min por parada.

type Punto = { x: number; y: number };

export const locOf = (locs: RouteLocation[], id: string): RouteLocation | undefined => locs.find((p) => p.id === id);

/** Quita duplicados y paradas que ya no existen en el mapa. */
export const validStops = (locs: RouteLocation[], ids: string[]): string[] =>
  [...new Set(ids)].filter((id) => locs.some((p) => p.id === id));

const legDistance = (a: Punto, b: Punto): number => Math.hypot(a.x - b.x, a.y - b.y) * 0.08;

export class RouteStats {
  stops: RouteLocation[];
  kg: string;
  distance: number;
  distanceLabel: string;
  minutes: number;
}

export function routeStats(locs: RouteLocation[], ids: string[]): RouteStats {
  let previous: Punto = ROUTE_ORIGIN;
  let distance = 0;
  let kg = 0;
  const stops = validStops(locs, ids).map((id) => locOf(locs, id)!);
  stops.forEach((p) => {
    distance += legDistance(previous, p);
    kg += p.kg;
    previous = p;
  });
  return {
    stops,
    kg: kg.toLocaleString('es-ES') + ' kg',
    distance,
    distanceLabel: distance.toFixed(1).replace('.', ',') + ' km',
    minutes: Math.ceil((distance / 15) * 60 + stops.length * 3),
  };
}

/** Ordena las paradas por cercanía (vecino más cercano) si eso acorta la ruta. */
export function optimizeStops(locs: RouteLocation[], ids: string[]): string[] {
  const remaining = validStops(locs, ids);
  const ordered: string[] = [];
  let previous: Punto = ROUTE_ORIGIN;
  while (remaining.length) {
    remaining.sort((a, b) => legDistance(previous, locOf(locs, a)!) - legDistance(previous, locOf(locs, b)!) || a.localeCompare(b));
    const id = remaining.shift()!;
    ordered.push(id);
    previous = locOf(locs, id)!;
  }
  return routeStats(locs, ordered).distance <= routeStats(locs, ids).distance ? ordered : validStops(locs, ids);
}
