// Anuncios de material del mapa y geometría de la ruta (coordenadas relativas).

export interface Ad {
  readonly id: string;
  readonly kg: string;
  readonly mat: string;
  readonly material: string;
  readonly place: string;
  readonly dist: string;
  readonly eta: string;
  readonly window: string;
}

export interface RouteLocation {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly x: number;
  readonly y: number;
  readonly kg: number;
  readonly pickup?: string | null;
}

export interface SavedRoute {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  stops: string[];
}

// Origen del trazo dibujado (esquina inferior izquierda del mapa). Los anuncios y puntos
// reales se proyectan a este mismo lienzo desde su latitud/longitud (core/mappers.ts).
export const ROUTE_ORIGIN = { x: 12, y: 92 };
