import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Api } from '../core/api';
import { FakeApi } from '../testing/fake-api';
import { authGuard, roleGuard } from './auth.guard';
import { AuthService } from './auth.service';

// authGuard protege /app (JWT vigente); roleGuard deja pasar solo al rol de cada pantalla.
describe('guards', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: Api, useValue: new FakeApi() }] });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  const login = (email: string) => { auth.updateField('email', email); auth.updateField('password', 'Secreta123'); auth.login().subscribe(); };
  const url = (r: unknown) => router.serializeUrl(r as UrlTree);
  const runAuth = () => TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
  const runRole = (role: 'reciclador' | 'generador') => TestBed.runInInjectionContext(() => roleGuard(role)({} as never, {} as never));

  it('authGuard sin sesión redirige a /login', () => {
    const result = runAuth();
    expect(result).toBeInstanceOf(UrlTree);
    expect(url(result)).toBe('/login');
  });

  it('authGuard con JWT vigente permite el acceso', () => {
    login('rec@qhurinet.pe');
    expect(runAuth()).toBe(true);
  });

  it('roleGuard sin sesión redirige a /login', () => {
    expect(url(runRole('reciclador'))).toBe('/login');
  });

  it('roleGuard deja pasar al reciclador a sus pantallas', () => {
    login('rec@qhurinet.pe');
    expect(runRole('reciclador')).toBe(true);
  });

  it('roleGuard manda al reciclador que entra a una pantalla de generador a su Mapa', () => {
    login('rec@qhurinet.pe');
    expect(url(runRole('generador'))).toBe('/app/mapa');
  });

  it('roleGuard manda al generador que entra a una pantalla de reciclador a Publicar', () => {
    login('gen@qhurinet.pe');
    expect(runRole('generador')).toBe(true);
    expect(url(runRole('reciclador'))).toBe('/app/publicar');
  });
});
