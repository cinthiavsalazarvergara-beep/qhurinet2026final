// Cuentas, roles, pestañas y cabeceras. Dos tipos de cuenta ↔ dos roles del backend
// (generador / recolector). El rol lo dicta el servidor al iniciar sesión.

export type AccountType = 'ciudadano' | 'bodega';
export type Role = 'reciclador' | 'generador';
export type AuthMode = 'login' | 'register';
export type Tab = 'mapa' | 'recojos' | 'chats' | 'publicar' | 'publicaciones' | 'perfil' | 'soporte';

export class AccountTypeInfo {
  key: AccountType;
  label: string;
  hint: string;
  role: Role;
  /** id del rol en la tabla `roles` del backend (data.sql: generador=1, recolector=2). */
  rolId: number;
}

export const ACCOUNT_TYPES: Record<AccountType, AccountTypeInfo> = {
  ciudadano: { key: 'ciudadano', label: 'Ciudadano', hint: 'Recojo materiales en mi zona', role: 'reciclador', rolId: 2 },
  bodega: { key: 'bodega', label: 'Bodega o comercio', hint: 'Genero residuos aprovechables', role: 'generador', rolId: 1 },
};

export const ACCOUNT_TYPE_LIST: AccountTypeInfo[] = Object.values(ACCOUNT_TYPES);

// Pestañas por rol, en orden de la barra lateral.
export const RECICLADOR_TABS: Tab[] = ['mapa', 'recojos', 'chats', 'perfil', 'soporte'];
export const GENERADOR_TABS: Tab[] = ['publicar', 'publicaciones', 'chats', 'perfil', 'soporte'];

export const TAB_LABELS: Record<Tab, string> = {
  mapa: 'MAPA',
  recojos: 'RECOJOS',
  chats: 'CHATS',
  publicar: 'PUBLICAR',
  publicaciones: 'ANUNCIOS',
  perfil: 'PERFIL',
  soporte: 'SOPORTE',
};

// Título y subtítulo de la cabecera por pestaña.
export const HEADERS: Record<Tab, [string, string]> = {
  mapa: ['Materiales disponibles', '14 anuncios activos · radio 5 km · San Isidro'],
  recojos: ['Mis recojos', '2 activos · 30 completados este mes'],
  chats: ['Mensajes', '3 conversaciones abiertas'],
  publicar: ['Anunciar material', 'Publica en menos de un minuto'],
  publicaciones: ['Mis publicaciones', '3 activos · 12 completados este mes'],
  perfil: ['Mi perfil', 'Reciclador verificado · Lima Centro'],
  soporte: ['Soporte', 'Respuesta promedio 12 min · llamada 24/7'],
};

/** Pantalla inicial de cada rol. */
export const homeFor = (role: Role): Tab => (role === 'generador' ? 'publicar' : 'mapa');
