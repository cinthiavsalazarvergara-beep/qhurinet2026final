// Soporte: preguntas frecuentes, tickets, categorías y reglas de sugerencia.

export interface Faq {
  readonly q: string;
  readonly a: string;
}

export interface Ticket {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly state: string;
  readonly evidence?: boolean;
  readonly evidenceName?: string;
}

export const TICKET_STATES: Record<string, readonly [string, string]> = {
  Abierto: ['#e7edf3', '#3d5a73'],
  Cerrado: ['#eef2e4', '#3f6224'],
};

// Categorías de ticket del backend (valor ↔ etiqueta mostrada).
export const TICKET_CATEGORIES: Record<string, string> = {
  problema_con_recolector: 'Problema con el recolector',
  problema_con_generador: 'Problema con el generador',
  material_no_coincide: 'Material distinto',
  error_en_plataforma: 'Error en la app',
  otro: 'Otro',
};
export const REPORT_CATEGORIES = Object.values(TICKET_CATEGORIES);
export const ticketCategoryValue = (label: string): string => Object.keys(TICKET_CATEGORIES).find((k) => TICKET_CATEGORIES[k] === label) ?? 'otro';

export const PAY_OPTIONS = ['Sin pago', 'Yape', 'Efectivo'] as const;

// Sugerencia de material por palabras clave: simula el clasificador del sistema.
export interface SuggestRule {
  readonly mat: string;
  readonly confidence: number;
  readonly keys: string[];
}

export const SUGGEST_RULES: readonly SuggestRule[] = [
  { mat: 'carton', confidence: 92, keys: ['carton', 'caja', 'cajas', 'corrugado'] },
  { mat: 'pet', confidence: 90, keys: ['botella', 'botellas', 'pet', 'gaseosa'] },
  { mat: 'vidrio', confidence: 91, keys: ['vidrio', 'frasco', 'frascos', 'vino', 'cerveza'] },
  { mat: 'metal', confidence: 86, keys: ['lata', 'latas', 'metal', 'aluminio', 'fierro', 'chatarra'] },
  { mat: 'plastico', confidence: 85, keys: ['plastico', 'bolsa', 'bolsas', 'envase', 'envases', 'tapa', 'tapas'] },
];
