import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import {
  ACCOUNT_TYPES, AccountType, AuthErrors, AuthForm, AuthMode, Role, Session,
} from '../model/account.model';
import { Api } from '../core/api';
import { UsuarioDTO } from '../core/api.models';
import { errorMessage } from '../core/http-error';

const EMPTY_FORM: AuthForm = { name: '', email: '', phone: '', password: '' };
const STORAGE_KEY = 'qhurinet.session';

// Validadores (alineados con el backend: email con dominio, teléfono peruano de 9 dígitos).
export const validEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v ?? '').trim());
export const validPhone = (v: string): boolean => /^\d{9}$/.test((v ?? '').replace(/^\+?51/, '').replace(/\D/g, ''));

/** El backend llama «recolector» al reciclador; «generador» coincide. */
export const roleFromBackend = (rol: string | null | undefined): Role | null =>
  rol === 'recolector' ? 'reciclador' : rol === 'generador' ? 'generador' : null;

/** Lee el payload del JWT sin validarlo (la validación real la hace el backend). */
export function decodeJwt(token: string): { exp?: number; rol?: string; sub?: string } | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch {
    return null;
  }
}

/**
 * Autenticación REAL contra el backend: login con JWT, registro y verificación de correo.
 * La sesión (token + usuario) se guarda en sessionStorage y se restaura al recargar.
 * El rol sale del servidor, nunca de lo que el usuario elija al entrar.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly router = inject(Router, { optional: true });

  readonly selectedAccount = signal<AccountType | ''>('');
  readonly form = signal<AuthForm>({ ...EMPTY_FORM });
  readonly errors = signal<AuthErrors>({});
  readonly loading = signal(false);
  /** Mensaje general (error del servidor o aviso de registro). */
  readonly serverError = signal('');
  readonly notice = signal('');

  private readonly _session = signal<Session | null>(this.restore());
  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => {
    const s = this._session();
    return !!s && !this.expired(s.token);
  });
  readonly token = computed(() => this._session()?.token ?? null);

  selectAccount(type: AccountType): void {
    this.selectedAccount.set(type);
    this.clearError('account');
  }

  preselectAccount(type: string | null | undefined): void {
    if (type && type in ACCOUNT_TYPES && !this.selectedAccount()) this.selectedAccount.set(type as AccountType);
  }

  updateField<K extends keyof AuthForm>(key: K, value: string): void {
    this.form.update((f) => ({ ...f, [key]: value.slice(0, 80) }));
    this.clearError(key);
    this.serverError.set('');
  }

  clearErrors(): void { this.errors.set({}); this.serverError.set(''); this.notice.set(''); }

  /** Validación local previa al envío. En login no se pide tipo de cuenta: lo dicta el servidor. */
  validate(mode: AuthMode): AuthErrors {
    const f = this.form();
    const register = mode === 'register';
    const errors: AuthErrors = {};
    if (register && f.name.trim().split(/\s+/).length < 2) errors.name = 'Escribe tu nombre y apellidos.';
    if (!validEmail(f.email)) errors.email = 'Ingresa un correo válido, como nombre@dominio.com.';
    if (register && !validPhone(f.phone)) errors.phone = 'El teléfono debe tener 9 dígitos (formato peruano).';
    if (f.password.length < 8) {
      errors.password = register ? 'La contraseña debe tener al menos 8 caracteres.' : 'Ingresa tu contraseña (mínimo 8 caracteres).';
    }
    if (register && !this.selectedAccount()) errors.account = 'Elige un tipo de cuenta para continuar.';
    return errors;
  }

  /** Login real (END-02). Emite el rol de entrada, o null si la validación o el servidor lo rechazan. */
  login(): Observable<Role | null> {
    const errors = this.validate('login');
    if (Object.keys(errors).length) { this.errors.set(errors); return of(null); }
    this.loading.set(true); this.serverError.set('');
    return this.api.login(this.form().email.trim().toLowerCase(), this.form().password).pipe(
      map((res) => this.enter(res.token, res.usuario)),
      catchError((err) => {
        this.serverError.set(err?.status === 401 ? 'Correo o contraseña incorrectos.' : errorMessage(err));
        return of(null);
      }),
      tap(() => this.loading.set(false)),
    );
  }

  /** Registro real (END-01). Emite true si la cuenta se creó (queda pendiente de verificar el correo). */
  register(): Observable<boolean> {
    const errors = this.validate('register');
    if (Object.keys(errors).length) { this.errors.set(errors); return of(false); }
    const f = this.form();
    this.loading.set(true); this.serverError.set('');
    return this.api.register({
      nombreCompleto: f.name.trim(), email: f.email.trim().toLowerCase(), password: f.password,
      telefono: f.phone.replace(/\s/g, ''), rolId: ACCOUNT_TYPES[this.selectedAccount() as AccountType].rolId,
    }).pipe(
      map(() => {
        this.notice.set('Cuenta creada. Te enviamos un enlace para confirmar tu correo; después podrás iniciar sesión.');
        this.form.set({ ...EMPTY_FORM });
        return true;
      }),
      catchError((err) => { this.serverError.set(errorMessage(err)); return of(false); }),
      tap(() => this.loading.set(false)),
    );
  }

  verifyEmail(token: string): Observable<UsuarioDTO> {
    return this.api.verifyEmail(token).pipe(catchError((err) => throwError(() => new Error(errorMessage(err)))));
  }

  /** Cierra la sesión y limpia todo rastro local. */
  logout(): void {
    this._session.set(null);
    this.persist(null);
    this.selectedAccount.set('');
    this.form.set({ ...EMPTY_FORM });
    this.errors.set({});
    this.serverError.set('');
    this.notice.set('');
  }

  /** Respuesta 401 del backend: el token venció o es inválido. */
  sessionExpired(): void {
    const had = this._session() !== null;
    this.logout();
    if (had) { this.notice.set('Tu sesión venció. Inicia sesión de nuevo.'); this.router?.navigate(['/login']); }
  }

  private enter(token: string, user: UsuarioDTO): Role {
    const role = roleFromBackend(user.rolNombre) ?? roleFromBackend(decodeJwt(token)?.rol?.replace('ROLE_', '').toLowerCase()) ?? 'reciclador';
    const account: AccountType = role === 'generador' ? 'bodega' : 'ciudadano';
    const session: Session = { account, role, token, user };
    this._session.set(session);
    this.persist(session);
    this.form.set({ ...EMPTY_FORM });
    this.errors.set({});
    this.notice.set('');
    return role;
  }

  private expired(token: string): boolean {
    const exp = decodeJwt(token)?.exp;
    return !!exp && exp * 1000 <= Date.now();
  }

  private restore(): Session | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const s = raw ? (JSON.parse(raw) as Session) : null;
      return s && s.token && !this.expired(s.token) ? s : null;
    } catch { return null; }
  }

  private persist(s: Session | null): void {
    try { s ? sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)) : sessionStorage.removeItem(STORAGE_KEY); } catch { /* sin storage */ }
  }

  private clearError(key: keyof AuthErrors): void { this.errors.update((e) => ({ ...e, [key]: '' })); }
}
