import { Delivery, DeliveryRow, SCANNABLE_STATES, rowRole } from '../model/delivery';

// Ciclo de vida del recojo (backend): creada → coordinada → en_camino → ejecutada, con cancelada.
// Reclamar un anuncio deja el recojo «Creada»; coordinar día y franja lo pasa a «Coordinada»;
// iniciar el recorrido lo pone «En camino»; validar el QR del generador lo completa.
const STATE_STYLE: Record<string, [string, string]> = {
  Creada: ['#fdf3dd', '#8a6a1f'],
  Coordinada: ['#eceee7', '#5d6b5f'],
  'En camino': ['#eef2e4', '#3f6224'],
  Completado: ['#eef2e4', '#3f6224'],
  Reprogramado: ['#fdf3dd', '#8a6a1f'],
  Cancelado: ['#f7e9e4', '#b1573f'],
  Esperando: ['#fdf3dd', '#8a6a1f'],
  Reclamado: ['#eceee7', '#5d6b5f'],
};

/** true si la entrega ya terminó (no admite reprogramar ni cancelar). */
export const isClosed = (row: Delivery | null | undefined): boolean =>
  !row || ['Completado', 'Cancelado'].includes(row.state);

/** true si el QR de entrega ya se puede validar para esta fila de recojo. */
export const canScan = (row: Delivery | null | undefined): boolean =>
  !!row && !!row.code && SCANNABLE_STATES.includes(row.state);

/** Calcula los permisos y colores de una fila de la tabla de entregas. */
export function toRow(row: Delivery): DeliveryRow {
  const locked = isClosed(row);
  const style = STATE_STYLE[row.state];
  const isRecojo = rowRole(row.id) === 'reciclador';
  return {
    ...row,
    priority: !!row.priority,
    rowBg: row.priority ? '#fdf3dd' : '#ffffff',
    stateBg: style ? style[0] : row.stateBg,
    stateFg: style ? style[1] : row.stateFg,
    locked,
    lockHint: locked ? 'Esta recolección ya está cerrada.' : '',
    priorityLabel: row.priority ? 'Quitar prioridad' : 'Marcar como prioritaria',
    canTrack: !isRecojo && row.state === 'En camino',
    canRate: !isRecojo && row.state === 'Completado' && !!row.requestId,
    canScan: isRecojo && canScan(row),
    canCoordinate: isRecojo && row.state === 'Creada',
    canStartRoute: isRecojo && row.state === 'Coordinada',
  };
}
