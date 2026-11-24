import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FakeApi } from '../testing/fake-api';
import { testProviders } from '../testing/test-config';
import { decodeJwt, LoginService, roleFromBackend } from './login-service';
import { Role } from '../model/account';

describe('JWT y roles', () => {
  it('decodeJwt lee el payload y devuelve null con un token roto', () => {
    const token = 'h.' + btoa(JSON.stringify({ sub: 'a@b.pe', exp: 123 })) + '.s';
    expect(decodeJwt(token)).toEqual(jasmine.objectContaining({ sub: 'a@b.pe', exp: 123 }));
    expect(decodeJwt('no-es-un-jwt')).toBeNull();
  });

  it('roleFromBackend traduce recolector → reciclador', () => {
    expect(roleFromBackend('recolector')).toBe('reciclador');
    expect(roleFromBackend('generador')).toBe('generador');
    expect(roleFromBackend('administrador')).toBeNull();
  });
});

// Autenticación contra el backend en memoria (FakeApi): token del header, rol del servidor y registro.
describe('LoginService', () => {
  let service: LoginService;
  let api: FakeApi;

  beforeEach(() => {
    localStorage.clear();
    api = new FakeApi();
    TestBed.configureTestingModule({ providers: testProviders(api) });
    service = TestBed.inject(LoginService);
  });

  const entrar = (email: string, password = 'Secreta123') => {
    let rol: Role | undefined;
    let error: { status?: number } | undefined;
    service.login({ email, password }).subscribe({ next: (r) => (rol = r), error: (e) => (error = e) });
    return { rol, error };
  };

  it('arranca sin sesión', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
    expect(service.getRole()).toBeNull();
  });

  it('login de un recolector entra como reciclador y guarda token, rol y usuario en localStorage', () => {
    const { rol } = entrar('rec@qhurinet.pe');
    expect(rol).toBe('reciclador');
    const token = localStorage.getItem('token')!;
    expect(token.split('.').length).toBe(3);
    expect(service.getToken()).toBe(token);
    expect(localStorage.getItem('rol')).toBe('reciclador');
    expect(service.getUser()?.email).toBe('rec@qhurinet.pe');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('login de un generador entra como generador (el rol sale del servidor)', () => {
    expect(entrar('gen@qhurinet.pe').rol).toBe('generador');
    expect(service.getRole()).toBe('generador');
  });

  it('credenciales incorrectas devuelven 401 y no abren sesión', () => {
    const { rol, error } = entrar('rec@qhurinet.pe', 'incorrecta1');
    expect(rol).toBeUndefined();
    expect(error?.status).toBe(401);
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('registro crea la cuenta pendiente de verificar (sin abrir sesión)', () => {
    let estado = '';
    service.register({ nombreCompleto: 'Ana Torres', email: 'ana@demo.pe', password: 'clave1234', telefono: '987654321', rolId: 1 })
      .subscribe((u) => (estado = u.estado));
    expect(estado).toBe('pendiente_verificacion');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('registro con un correo repetido devuelve el error del servidor', () => {
    let status = 0;
    service.register({ nombreCompleto: 'Ana Torres', email: 'repetido@qhurinet.pe', password: 'clave1234', telefono: '987654321', rolId: 2 })
      .subscribe({ error: (e) => (status = e.status) });
    expect(status).toBe(409);
  });

  it('verifyEmail confirma con un token válido y falla con uno inválido', () => {
    let ok = false;
    let status = 0;
    service.verifyEmail('ok').subscribe(() => (ok = true));
    service.verifyEmail('malo').subscribe({ error: (e) => (status = e.status) });
    expect(ok).toBeTrue();
    expect(status).toBe(400);
  });

  it('logout borra solo las claves de la sesión', () => {
    localStorage.setItem('otra-clave', 'x');
    entrar('gen@qhurinet.pe');
    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('rol')).toBeNull();
    expect(localStorage.getItem('otra-clave')).toBe('x');
  });

  it('un token vencido no cuenta como sesión', () => {
    localStorage.setItem('token', 'h.' + btoa(JSON.stringify({ exp: 1 })) + '.s');
    localStorage.setItem('rol', 'reciclador');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('sessionExpired cierra la sesión, deja el aviso y manda al login', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    entrar('rec@qhurinet.pe');
    service.sessionExpired();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.aviso).toContain('venció');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
