import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../model/account.model';
import { AuthService } from './auth.service';

/** Protege la consola (/app): sin JWT vigente redirige al acceso. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

/** Pantalla inicial de cada rol. */
export const homeFor = (role: Role): string => (role === 'generador' ? 'publicar' : 'mapa');

/**
 * Guard por rol: solo deja pasar al rol indicado. Un reciclador que escribe /app/publicar
 * (o un generador que escribe /app/mapa) vuelve a la pantalla de su propio rol.
 */
export const roleGuard = (role: Role): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const session = auth.session();
  if (!auth.isAuthenticated() || !session) return router.createUrlTree(['/login']);
  return session.role === role ? true : router.createUrlTree(['/app', homeFor(session.role)]);
};
