// Entregas: recojos (reciclador) y publicaciones (generador). Misma forma para
// que el menú de acciones y las actualizaciones por fila funcionen igual.

export interface Delivery {
  readonly id: string;
  readonly thread: string;
  readonly code?: string;
  /** id de la solicitud de recolección en el backend (si existe). */
  readonly requestId?: number;
  /** id de la publicación en el backend. */
  readonly publicationId?: number;
  readonly address?: string;
  kg: string;
  material: string;
  readonly place?: string;
  readonly posted?: string;
  person: string;
  readonly personFg?: string;
  window: string;
  state: string;
  stateBg: string;
  stateFg: string;
  // Campos añadidos por las actualizaciones por fila (rowUpdates):
  priority?: boolean;
  date?: string;
  slot?: string;
  reason?: string;
}

/** Cambios confirmados por fila (reprogramar, cancelar, prioridad, completar). */
export interface RowUpdate {
  priority?: boolean;
  state?: string;
  date?: string;
  slot?: string;
  reason?: string;
}

// Franjas que acepta el backend (disponibilidad.franjas): valor enviado → etiqueta mostrada.
export const TIME_SLOTS = ['manana', 'tarde', 'noche'] as const;
export const SLOT_LABELS: Record<string, string> = { manana: 'Mañana (8:00–12:00)', tarde: 'Tarde (12:00–18:00)', noche: 'Noche (18:00–21:00)' };

/** Los ids de recojos empiezan por "r"; los de anuncios por "g"/"n". */
export const rowRole = (id: string): 'reciclador' | 'generador' =>
  id.startsWith('r') ? 'reciclador' : 'generador';
