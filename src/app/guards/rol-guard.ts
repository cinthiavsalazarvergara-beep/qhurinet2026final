import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { LoginService } from '../services/login-service';
import { homeFor, Role } from '../model/account';

/**
 * Guard por rol: solo deja pasar al rol indicado en `data: { rol }` de la ruta.
 * Un reciclador que escribe /app/publicar (o un generador que escribe /app/mapa)
 * vuelve a la pantalla de su propio rol.
 */
@Injectable({
  providedIn: 'root',
})
export class RolGuard implements CanActivate {
  private router: Router = inject(Router);
  private loginService: LoginService = inject(LoginService);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const rolRuta = route.data['rol'] as Role;
    const rol = this.loginService.getRole();
    if (!this.loginService.isAuthenticated() || !rol) {
      return this.router.createUrlTree(['/login']);
    }
    if (rol === rolRuta) {
      return true;
    }
    return this.router.createUrlTree(['/app', homeFor(rol)]);
  }
}
