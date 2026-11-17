import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { Api } from '../core/api';
import { FakeApi } from '../testing/fake-api';
import { AuthService, decodeJwt, roleFromBackend, validEmail, validPhone } from './auth.service';

describe('validadores de formato', () => {
  it('validEmail acepta correos válidos y rechaza mal formados', () => {
    expect(validEmail('marco.q@gmail.com')).toBe(true);
    expect(validEmail('  espacios@dominio.pe  ')).toBe(true);
    expect(validEmail('sinarroba')).toBe(false);
    expect(validEmail('a@b.c')).toBe(false);
  });

  it('validPhone acepta 9 dígitos (con o sin +51) y rechaza el resto', () => {
    expect(validPhone('987654321')).toBe(true);
    expect(validPhone('+51 987 654 321')).toBe(true);
    expect(validPhone('12345')).toBe(false);
    expect(validPhone('9876543210')).toBe(false);
  });
});

describe('JWT y roles', () => {
  it('decodeJwt lee el payload y devuelve null con un token roto', () => {
    const token = 'h.' + btoa(JSON.stringify({ sub: 'a@b.pe', exp: 123 })) + '.s';
    expect(decodeJwt(token)).toMatchObject({ sub: 'a@b.pe', exp: 123 });
    expect(decodeJwt('no-es-un-jwt')).toBeNull();
  });

  it('roleFromBackend traduce recolector → reciclador', () => {
    expect(roleFromBackend('recolector')).toBe('reciclador');
    expect(roleFromBackend('generador')).toBe('generador');
    expect(roleFromBackend('administrador')).toBeNull();
  });
});

// Autenticación contra el backend en memoria (FakeApi): JWT, rol del servidor y registro.
describe('AuthService', () => {
  let auth: AuthService;
  const fill = (email: string, password: string) => { auth.updateField('email', email); auth.updateField('password', password); };
  const login = () => { let role: string | null | undefined; auth.login().subscribe((r) => (role = r)); return role; };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: Api, useValue: new FakeApi() }, { provide: Router, useValue: { navigate: vi.fn() } }],
    });
    auth = TestBed.inject(AuthService);
  });

  it('arranca sin sesión y con el formulario vacío', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(auth.selectedAccount()).toBe('');
    expect(auth.form()).toEqual({ name: '', email: '', phone: '', password: '' });
  });

  it('selectAccount fija la cuenta y limpia su error', () => {
    auth.errors.set({ account: 'x' });
    auth.selectAccount('bodega');
    expect(auth.selectedAccount()).toBe('bodega');
    expect(auth.errors().account).toBe('');
  });

  it('preselectAccount solo aplica valores válidos y no pisa una elección previa', () => {
    auth.preselectAccount('desconocido');
    expect(auth.selectedAccount()).toBe('');
    auth.preselectAccount('ciudadano');
    auth.preselectAccount('bodega');
    expect(auth.selectedAccount()).toBe('ciudadano');
  });

  it('updateField recorta a 80 y limpia el error del campo', () => {
    auth.errors.set({ email: 'x' });
    auth.updateField('email', 'a'.repeat(100));
    expect(auth.form().email.length).toBe(80);
    expect(auth.errors().email).toBe('');
  });

  it('login inválido no llama al servidor y muestra los mensajes de validación', () => {
    fill('malcorreo', '123');
    expect(login()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.errors()).toMatchObject({
      email: 'Ingresa un correo válido, como nombre@dominio.com.',
      password: 'Ingresa tu contraseña (mínimo 8 caracteres).',
    });
    expect(auth.errors().account).toBeUndefined(); // al entrar, el rol lo dicta el servidor
  });

  it('login válido de un recolector entra como reciclador con su JWT', () => {
    fill('rec@qhurinet.pe', 'Secreta123');
    expect(login()).toBe('reciclador');
    const s = auth.session()!;
    expect(s.role).toBe('reciclador');
    expect(s.account).toBe('ciudadano');
    expect(s.token.split('.').length).toBe(3);
    expect(auth.token()).toBe(s.token);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.form()).toEqual({ name: '', email: '', phone: '', password: '' });
    expect(sessionStorage.getItem('qhurinet.session')).toContain(s.token);
  });

  it('login de un generador entra como generador (el rol sale del servidor)', () => {
    fill('gen@qhurinet.pe', 'Secreta123');
    expect(login()).toBe('generador');
    expect(auth.session()!.account).toBe('bodega');
  });

  it('credenciales incorrectas muestran el error del servidor y no abren sesión', () => {
    fill('rec@qhurinet.pe', 'incorrecta1');
    expect(login()).toBeNull();
    expect(auth.serverError()).toBe('Correo o contraseña incorrectos.');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('registro inválido: nombre corto, teléfono, contraseña y falta de cuenta', () => {
    auth.updateField('name', 'Marco');
    auth.updateField('email', 'ficticio@demo.pe');
    auth.updateField('phone', '12345');
    auth.updateField('password', '1234567');
    let ok: boolean | undefined;
    auth.register().subscribe((r) => (ok = r));
    expect(ok).toBe(false);
    expect(auth.errors()).toMatchObject({
      name: 'Escribe tu nombre y apellidos.',
      phone: 'El teléfono debe tener 9 dígitos (formato peruano).',
      password: 'La contraseña debe tener al menos 8 caracteres.',
      account: 'Elige un tipo de cuenta para continuar.',
    });
  });

  it('registro válido crea la cuenta pendiente de verificar (sin abrir sesión)', () => {
    auth.selectAccount('bodega');
    auth.updateField('name', 'Ana Torres');
    auth.updateField('email', 'ana@demo.pe');
    auth.updateField('phone', '+51 987 654 321');
    auth.updateField('password', 'clave1234');
    let ok: boolean | undefined;
    auth.register().subscribe((r) => (ok = r));
    expect(ok).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.notice()).toContain('confirmar tu correo');
  });

  it('registro con un correo repetido muestra el error del servidor', () => {
    auth.selectAccount('ciudadano');
    auth.updateField('name', 'Ana Torres');
    auth.updateField('email', 'repetido@qhurinet.pe');
    auth.updateField('phone', '987654321');
    auth.updateField('password', 'clave1234');
    auth.register().subscribe();
    expect(auth.serverError()).toContain('ya está registrado');
  });

  it('verifyEmail confirma con un token válido y falla con uno inválido', () => {
    let ok = false;
    let msg = '';
    auth.verifyEmail('ok').subscribe(() => (ok = true));
    auth.verifyEmail('malo').subscribe({ error: (e: Error) => (msg = e.message) });
    expect(ok).toBe(true);
    expect(msg).toContain('Token inválido');
  });

  it('logout vuelve al estado inicial y borra la sesión guardada', () => {
    fill('gen@qhurinet.pe', 'Secreta123');
    login();
    auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.selectedAccount()).toBe('');
    expect(sessionStorage.getItem('qhurinet.session')).toBeNull();
  });

  it('un token vencido no cuenta como sesión', () => {
    const expired = 'h.' + btoa(JSON.stringify({ exp: 1 })) + '.s';
    sessionStorage.setItem('qhurinet.session', JSON.stringify({ account: 'ciudadano', role: 'reciclador', token: expired, user: { id: 1, nombreCompleto: 'x', email: 'x@y.pe', rolNombre: 'recolector' } }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), { provide: Api, useValue: new FakeApi() }, { provide: Router, useValue: { navigate: vi.fn() } }] });
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
  });

  it('sessionExpired cierra la sesión, avisa y manda al login', () => {
    fill('rec@qhurinet.pe', 'Secreta123');
    login();
    auth.sessionExpired();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.notice()).toContain('venció');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
  });
});
