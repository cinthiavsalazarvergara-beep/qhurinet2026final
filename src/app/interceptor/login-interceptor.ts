import { HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginService } from '../services/login-service';

/*
  Interceptor que añade el token JWT a las peticiones a la API y gestiona
  los errores de autorización de forma centralizada.

  Registrado en app.config.ts:
  provideHttpClient(withInterceptors([loginInterceptor]))
*/
export const loginInterceptor: HttpInterceptorFn = (req, next) => {
  const loginService = inject(LoginService);
  const base = environment.apiUrl;

  // Solo las llamadas a nuestra API llevan el token.
  if (!req.url.startsWith(base)) {
    return next(req);
  }
  // En /auth/* (login, registro) no se envía token y un 401 son credenciales malas.
  const esAuth = req.url.startsWith(base + '/auth/');
  const token = loginService.getToken();

  const authReq = token && !esAuth
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      switch (error.status) {
        case HttpStatusCode.Unauthorized: // 401: token vencido o inválido
          if (!esAuth) {
            loginService.sessionExpired();
          }
          return throwError(() => error);
        default:
          return throwError(() => error);
      }
    }),
  );
};
