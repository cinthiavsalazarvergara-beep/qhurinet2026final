import { HttpErrorResponse } from '@angular/common/http';

/** Texto legible para el usuario a partir de un error HTTP del backend ({code, message}). */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse || (err && typeof err === 'object' && 'status' in err)) {
    const e = err as HttpErrorResponse;
    if (e.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
    const msg = e.error?.message;
    if (typeof msg === 'string' && msg) return msg.replace(/^[a-zA-Z]+: /, (m) => m.charAt(0).toUpperCase() + m.slice(1));
    if (e.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (e.status === 404) return 'No se encontró el recurso solicitado.';
    if (e.status >= 500) return 'El servidor tuvo un problema. Inténtalo de nuevo.';
  }
  return 'Ocurrió un error inesperado.';
}
