import { svg, ICONS } from './icons';

// Puntos fijos de reciclaje y sus tipos. Datos de muestra del prototipo.

export type PointTypeKey = 'acopio' | 'bodega' | 'reciclador' | 'municipal';

export interface PointTypeInfo {
  readonly label: string;
  readonly icon: string;
}

export interface RecyclingPoint {
  readonly id: string;
  readonly name: string;
  readonly type: PointTypeKey;
  readonly address: string;
  readonly district: string;
  readonly x: number;
  readonly y: number;
  readonly hours: string;
  readonly rating: number;
  readonly distance: number;
  readonly materials: string[];
}

export const POINT_TYPES: Record<PointTypeKey, PointTypeInfo> = {
  acopio: { label: 'Centro de acopio', icon: svg('<path d="M3 10 L12 4 L21 10 V20 H3 Z"/><path d="M8 20 V13 H16 V20"/>') },
  bodega: { label: 'Comercio o bodega', icon: svg('<path d="M4 10 H20 L18 5 H6 Z M5 10 V20 H19 V10 M9 20 V14 H15 V20"/>') },
  reciclador: { label: 'Reciclador', icon: ICONS['perfil'] },
  municipal: { label: 'Punto municipal', icon: svg('<path d="M4 9 L12 4 L20 9 Z M6 11 V18 M12 11 V18 M18 11 V18 M4 20 H20"/>') },
};

export const POINT_TYPE_KEYS = Object.keys(POINT_TYPES) as PointTypeKey[];
