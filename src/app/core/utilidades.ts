// Funciones de apoyo sin estado (fechas, texto, archivos) usadas por varios componentes.

const pad = (n: number): string => String(n).padStart(2, '0');

/** Quita tildes y mayúsculas para comparar textos en los buscadores. */
export const normalizeSearch = (t: string): string =>
  String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Fecha de un Date en formato yyyy-MM-dd (hora local). */
export const isoDate = (d: Date): string => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

/** Fecha de hoy en formato yyyy-MM-dd. */
export const todayDate = (): string => isoDate(new Date());

/** dd/MM/yyyy a partir de una fecha ISO del backend. */
export const shortDate = (iso: string): string => {
  const d = new Date(iso);
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
};

/** HH:mm a partir de una fecha ISO del backend. */
export const timeOf = (iso: string): string => {
  const d = new Date(iso);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
};

/** true si el texto es una fecha real con formato yyyy-MM-dd. */
export const validDate = (v: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

/** 987654321 → +51 987 654 321 (formato del prototipo). */
export const fmtPhone = (t: string | null | undefined): string => {
  const d = String(t ?? '').replace(/^\+?51/, '').replace(/\D/g, '');
  return d.length === 9 ? '+51 ' + d.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : String(t ?? '');
};

/** Iniciales de un nombre («Marco Quispe» → «MQ»). */
export const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

/**
 * Lee el archivo elegido en un <input type="file">. Si es imagen, entrega además su
 * vista previa como data URL; si no, la URL va vacía.
 */
export function readFile(input: HTMLInputElement, cb: (name: string, url: string, file: File) => void): void {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    cb(file.name, '', file);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => cb(file.name, String(reader.result), file);
  reader.readAsDataURL(file);
}

/** Descarga un Blob con el nombre indicado. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
