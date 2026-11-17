import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_URL } from './api';

/** Agrega `Authorization: Bearer` a las llamadas a la API y cierra sesión ante un 401 (token vencido). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const base = inject(API_URL);
  if (!req.url.startsWith(base)) return next(req);
  const isAuthCall = req.url.startsWith(base + '/auth/');
  const token = auth.token();
  const authed = token && !isAuthCall ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthCall) auth.sessionExpired();
      return throwError(() => err);
    }),
  );
};
