import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthRequestDTO, AuthResponseDTO, RegistrarUsuarioDTO, UsuarioDTO } from '../model/usuario';
import { Role } from '../model/account';

const TOKEN_KEY = 'token';
const ROL_KEY = 'rol';
const USUARIO_KEY = 'usuario';

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
 * Autenticación contra el backend: login con JWT, registro y verificación de correo.
 * El token, el rol y el usuario se guardan en localStorage. El token se toma del header
 * `Authorization` de la respuesta de login (y, si el navegador no lo expone, del cuerpo
 * `AuthResponseDTO`). El rol sale del servidor, nunca de lo que el usuario elija al entrar.
 */
@Injectable({ providedIn: 'root' })
export class LoginService {
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private url = environment.apiUrl + '/auth';
  /** Aviso para la pantalla de acceso (cuenta creada, sesión vencida). */
  aviso = '';

  /** Login (END-02). Guarda la sesión y emite el rol con el que se entra. */
  login(request: AuthRequestDTO): Observable<Role> {
    return this.http.post<AuthResponseDTO>(this.url + '/login', request, { observe: 'response' }).pipe(
      map((response) => {
        const body = response.body as AuthResponseDTO;
        return this.saveSession(response.headers.get('Authorization') ?? body.token, body.usuario);
      }),
    );
  }

  /** Registro (END-01): la cuenta queda pendiente de verificar el correo. */
  register(dto: RegistrarUsuarioDTO): Observable<UsuarioDTO> {
    return this.http.post<UsuarioDTO>(this.url + '/register', dto);
  }

  /** Verificación de correo (END-04). */
  verifyEmail(token: string): Observable<UsuarioDTO> {
    return this.http.post<UsuarioDTO>(this.url + '/verify-email', { token });
  }

  /** Token vigente o null si no hay sesión o el JWT ya venció. */
  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && !this.expired(token) ? token : null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  getRole(): Role | null {
    const rol = localStorage.getItem(ROL_KEY);
    return rol === 'generador' || rol === 'reciclador' ? rol : null;
  }

  getUser(): UsuarioDTO | null {
    try {
      const raw = localStorage.getItem(USUARIO_KEY);
      return raw ? (JSON.parse(raw) as UsuarioDTO) : null;
    } catch {
      return null;
    }
  }

  /** Cierra la sesión: borra solo las claves de la sesión (no todo el localStorage). */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROL_KEY);
    localStorage.removeItem(USUARIO_KEY);
  }

  /** Respuesta 401 del backend: el token venció o es inválido. */
  sessionExpired(): void {
    const had = localStorage.getItem(TOKEN_KEY) !== null;
    this.logout();
    if (had) {
      this.aviso = 'Tu sesión venció. Inicia sesión de nuevo.';
      this.router.navigate(['/login']);
    }
  }

  private saveSession(bearerToken: string | null, usuario: UsuarioDTO): Role {
    if (!bearerToken) {
      throw new Error('Token no encontrado en la respuesta del servidor');
    }
    const token = bearerToken.replace('Bearer ', '');
    const role = roleFromBackend(usuario?.rolNombre)
      ?? roleFromBackend(decodeJwt(token)?.rol?.replace('ROLE_', '').toLowerCase())
      ?? 'reciclador';
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROL_KEY, role);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    this.aviso = '';
    return role;
  }

  private expired(token: string): boolean {
    const exp = decodeJwt(token)?.exp;
    return !!exp && exp * 1000 <= Date.now();
  }
}
