// Anuncios de material del mapa y geometría de la ruta (coordenadas relativas).

export class Ad {
  id: string;
  kg: string;
  mat: string;
  material: string;
  place: string;
  dist: string;
  eta: string;
  window: string;
}

/** Anuncio del mapa con su posición en el lienzo y los datos numéricos del backend. */
export class AdView extends Ad {
  x: number;
  y: number;
  publicationId: number;
  kgNum: number;
}

export class RouteLocation {
  id: string;
  name: string;
  detail: string;
  x: number;
  y: number;
  kg: number;
  pickup?: string | null;
}

export class SavedRoute {
  id: string;
  name: string;
  description: string;
  stops: string[];
}

// Origen del trazo dibujado (esquina inferior izquierda del mapa). Los anuncios y puntos
// reales se proyectan a este mismo lienzo desde su latitud/longitud (core/mappers.ts).
export const ROUTE_ORIGIN = { x: 12, y: 92 };

/** Anuncio tal como se dibuja en la lista y en los pines del mapa. */
export class AnuncioMapa extends AdView {
  stopNumber: number;
  pinLabel: string;
  color: string;
  iconFg: string;
  claimed: boolean;
  featured: boolean;
  btnLabel: string;
}

/** Parada numerada de la ruta activa. */
export class ParadaRuta extends RouteLocation {
  number: number;
}

/** Ruta guardada con su resumen (paradas, distancia y minutos). */
export class RutaGuardadaVista extends SavedRoute {
  count: number;
  distance: string;
  minutes: number;
}

/** Chip de filtro del mapa (vista, filtro, material o tipo de punto). */
export class ChipFiltro {
  label: string;
  key: string;
  active: boolean;
  kind: 'view' | 'filter' | 'material' | 'type';
}
