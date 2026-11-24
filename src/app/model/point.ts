// Puntos fijos de reciclaje y sus tipos.

export type PointTypeKey = 'acopio' | 'bodega' | 'reciclador' | 'municipal';

export class RecyclingPoint {
  id: string;
  name: string;
  type: PointTypeKey;
  address: string;
  district: string;
  x: number;
  y: number;
  hours: string;
  rating: number;
  distance: number;
  materials: string[];
}

export const POINT_TYPES: Record<PointTypeKey, { label: string }> = {
  acopio: { label: 'Centro de acopio' },
  bodega: { label: 'Comercio o bodega' },
  reciclador: { label: 'Reciclador' },
  municipal: { label: 'Punto municipal' },
};

export const POINT_TYPE_KEYS = Object.keys(POINT_TYPES) as PointTypeKey[];

/** Punto de reciclaje tal como se dibuja en la lista, los pines y el detalle. */
export class PuntoMapa extends RecyclingPoint {
  typeLabel: string;
  pinLabel: string;
  distanceLabel: string;
  ratingLabel: string;
  tags: string[];
  inRoute: boolean;
  selected: boolean;
  stopNumber: number;
  routeLabel: string;
  routeHint: string;
}
