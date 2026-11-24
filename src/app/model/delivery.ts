// Entregas: recojos (reciclador) y publicaciones (generador). Misma forma para
// que el menú de acciones funcione igual en las dos tablas.

export class Delivery {
  id: string;
  thread: string;
  code?: string;
  /** id de la solicitud de recolección en el backend (si existe). */
  requestId?: number;
  /** id de la publicación en el backend. */
  publicationId?: number;
  address?: string;
  kg: string;
  material: string;
  place?: string;
  posted?: string;
  person: string;
  personFg?: string;
  window: string;
  state: string;
  stateBg: string;
  stateFg: string;
  priority?: boolean;
  date?: string;
  slot?: string;
  reason?: string;
}

/** Fila de la tabla de entregas con los permisos de cada acción ya calculados. */
export class DeliveryRow extends Delivery {
  rowBg: string;
  locked: boolean;
  lockHint: string;
  priorityLabel: string;
  canTrack: boolean;
  canScan: boolean;
  canRate: boolean;
  canCoordinate: boolean;
  canStartRoute: boolean;
}

export type DeliveryAction = 'reprogramar' | 'coordinar' | 'cancelar';

// Franjas que acepta el backend (disponibilidad.franjas): valor enviado → etiqueta mostrada.
export const TIME_SLOTS = ['manana', 'tarde', 'noche'];
export const SLOT_LABELS: Record<string, string> = { manana: 'Mañana (8:00–12:00)', tarde: 'Tarde (12:00–18:00)', noche: 'Noche (18:00–21:00)' };
export const SLOT_OPTIONS = TIME_SLOTS.map((v) => ({ value: v, label: SLOT_LABELS[v] }));

/** Estados en los que el QR de entrega ya se puede validar. */
export const SCANNABLE_STATES = ['Coordinada', 'En camino'];

/** Los ids de recojos empiezan por "r"; los de anuncios por "g". */
export const rowRole = (id: string): 'reciclador' | 'generador' =>
  id.startsWith('r') ? 'reciclador' : 'generador';
