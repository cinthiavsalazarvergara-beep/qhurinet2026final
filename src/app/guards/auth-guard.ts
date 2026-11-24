import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { LoginService } from '../services/login-service';

/**
 * Protege la consola (/app): sin un JWT vigente redirige al acceso.
 * Se genera con: ng generate guard guards/auth-guard --skip-tests
 */
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private router: Router = inject(Router);
  private loginService: LoginService = inject(LoginService);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (this.loginService.isAuthenticated()) {
      return true;
    }
    return this.router.createUrlTree(['/login']);
  }
}
