import { Ad, RouteLocation } from '../model/ad.model';
import { Delivery, SLOT_LABELS } from '../model/delivery.model';
import { RecyclingPoint, PointTypeKey, POINT_TYPES } from '../model/point.model';
import { MiPublicacionDTO, MiSolicitudDTO, PublicacionDTO, PuntoReciclajeDTO } from './api.models';

const norm = (t: string): string => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Nombre de la categoría del backend («cartón», «PET», «plástico»…) → clave del catálogo del front. */
export const matKey = (nombre: string): string => {
  const k = norm(nombre);
  return ['carton', 'pet', 'vidrio', 'metal', 'plastico', 'papel', 'electronicos', 'organico'].includes(k) ? k : 'carton';
};

// ---------------------------------------------------------------- formato
/** Decimales con coma, como en el prototipo (8,5 kg). */
export const fmtNum = (n: number | null | undefined, digits = 1): string => Number(n ?? 0).toLocaleString('es-ES', { maximumFractionDigits: digits });
export const kgLabel = (cantidad: number | null | undefined, unidad?: string | null): string => fmtNum(cantidad) + ' ' + (unidad || 'kg');
export const cap = (t: string | null | undefined): string => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

const pad = (n: number) => String(n).padStart(2, '0');

const RANGES: Record<string, string> = { manana: '08:00–12:00', tarde: '12:00–18:00', noche: '18:00–21:00' };
/** Ventana compacta del prototipo: «HOY 12:00–18:00», «MAÑ 08:00–12:00», «AYER», «HACE 2 D» o «15/01». */
export const windowLabel = (fecha: string | null | undefined, franja: string | null | undefined, now = new Date()): string => {
  const range = franja ? RANGES[franja] ?? franja : '';
  if (!fecha) return range || 'Por coordinar';
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  const day = diff === 0 ? 'HOY' : diff === 1 ? 'MAÑ' : diff === -1 ? 'AYER' : diff < -1 ? 'HACE ' + -diff + ' D' : pad(d) + '/' + pad(m);
  return diff < -1 ? day : day + (range ? ' ' + range : '');
};

export const relativeTime = (iso: string | null | undefined, now = Date.now()): string => {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return 'hace ' + Math.max(1, mins) + ' min';
  if (mins < 60 * 24) return 'hace ' + Math.round(mins / 60) + ' h';
  return 'hace ' + Math.round(mins / 1440) + ' d';
};

/** Estado de la solicitud del backend → etiqueta mostrada. */
export const REQUEST_STATE: Record<string, string> = {
  creada: 'Creada', coordinada: 'Coordinada', en_camino: 'En camino', ejecutada: 'Completado', cancelada: 'Cancelado',
};
export const ACTIVE_STATES = ['Creada', 'Coordinada', 'En camino', 'Reprogramado', 'Esperando', 'Reclamado'];
/** Pestañas de la tabla: Activos / Completados / Cancelados. */
export type DeliveryTab = 'activos' | 'completados' | 'cancelados';
export const stateTab = (state: string): DeliveryTab =>
  state === 'Completado' ? 'completados' : state === 'Cancelado' ? 'cancelados' : 'activos';

const NEUTRAL = { stateBg: '#eceee7', stateFg: '#5d6b5f' };

export function toPickup(d: MiSolicitudDTO): Delivery {
  const state = REQUEST_STATE[d.estado] ?? d.estado;
  return {
    id: 'r' + d.id, thread: 't' + d.id, code: 'QH-R' + d.id, requestId: d.id, publicationId: d.publicacionId ?? undefined,
    kg: kgLabel(d.cantidad, d.unidadMedida), material: cap(d.material), place: d.direccion, person: d.contraparte,
    window: windowLabel(d.fechaCoordinada, d.franjaHoraria), date: d.fechaCoordinada?.slice(0, 10), slot: d.franjaHoraria ?? undefined,
    state, priority: !!d.prioritaria, ...NEUTRAL,
  };
}

/** `solicitudEstado`: estado de la solicitud vigente (el DTO de «mis publicaciones» solo trae el de la publicación). */
export function toPublication(d: MiPublicacionDTO, solicitudEstado?: string): Delivery {
  const state = d.estado === 'recolectado' ? 'Completado'
    : d.estado === 'cancelado' ? 'Cancelado'
    : d.estado === 'reservado' ? (solicitudEstado === 'en_camino' ? 'En camino' : 'Reclamado')
    : 'Esperando';
  return {
    id: 'g' + d.id, thread: d.solicitudId ? 't' + d.solicitudId : '', requestId: d.solicitudId ?? undefined, publicationId: d.id,
    kg: kgLabel(d.cantidad, d.unidadMedida), material: cap(d.material), posted: 'Publicado ' + relativeTime(d.fechaPublicacion),
    person: d.reciclador || 'Sin reclamar', personFg: d.reciclador ? '#3d4a3f' : '#8b9186',
    window: windowLabel(d.fechaCoordinada, d.franjaHoraria), state, ...NEUTRAL,
  };
}

// ---------------------------------------------------------------- geografía
/** Centro de referencia (San Isidro) para distancias cuando no hay geolocalización. */
export const CITY_CENTER = { lat: -12.0975, lng: -77.0365 };
const BOX = { minLat: -12.2, maxLat: -12.02, minLng: -77.1, maxLng: -76.95 };
const clamp = (n: number) => Math.max(4, Math.min(96, Math.round(n)));
/** lat/lng → coordenadas relativas (0-100) del mapa dibujado. */
export const project = (lat: number | null, lng: number | null): { x: number; y: number } => ({
  x: clamp(((Number(lng ?? CITY_CENTER.lng) - BOX.minLng) / (BOX.maxLng - BOX.minLng)) * 100),
  y: clamp(((BOX.maxLat - Number(lat ?? CITY_CENTER.lat)) / (BOX.maxLat - BOX.minLat)) * 100),
});
export const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const km1 = (n: number) => n.toFixed(1).replace('.', ',');

export interface AdView extends Ad { readonly x: number; readonly y: number; readonly publicationId: number; readonly kgNum: number; }

export function toAd(d: PublicacionDTO, origin = CITY_CENTER): AdView {
  const dist = haversineKm(origin, { lat: Number(d.latitud ?? origin.lat), lng: Number(d.longitud ?? origin.lng) });
  const { x, y } = project(d.latitud, d.longitud);
  return {
    id: 'a' + d.id, publicationId: d.id, kgNum: Number(d.cantidad), kg: kgLabel(d.cantidad, d.unidadMedida),
    mat: matKey(d.categoriaMaterialNombre), material: cap(d.categoriaMaterialNombre),
    place: d.generadorNombreCompleto + ' · ' + d.direccion + (d.distrito ? ', ' + d.distrito : ''),
    dist: km1(dist) + ' KM', eta: '~' + Math.max(1, Math.round((dist / 15) * 60)) + ' MIN',
    window: windowLabel(d.fechaDisponibilidad, d.franjaHoraria).toUpperCase(), x, y,
  };
}

export function toPoint(d: PuntoReciclajeDTO, origin = CITY_CENTER): RecyclingPoint {
  const { x, y } = project(d.latitud, d.longitud);
  const type = (d.tipo in POINT_TYPES ? d.tipo : 'acopio') as PointTypeKey;
  return {
    id: 'p' + d.id, name: d.nombre, type, address: d.direccion, district: d.distrito, x, y, hours: d.horarioAtencion,
    rating: Number(d.calificacionPromedio ?? 0),
    distance: haversineKm(origin, { lat: Number(d.latitud), lng: Number(d.longitud) }),
    materials: [...new Set((d.materiales ?? []).map((m) => matKey(m.nombre)))],
  };
}

export const toLocation = (a: AdView, pickup: string | null): RouteLocation => ({
  id: a.id, name: a.place.split(' · ')[0], detail: a.material, x: a.x, y: a.y, kg: a.kgNum, pickup,
});
