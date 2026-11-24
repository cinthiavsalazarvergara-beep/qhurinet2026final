import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { FakeApi } from '../testing/fake-api';
import { login, testProviders } from '../testing/test-config';
import { AuthGuard } from './auth-guard';
import { RolGuard } from './rol-guard';

// AuthGuard protege /app (JWT vigente); RolGuard deja pasar solo al rol de cada pantalla.
describe('guards', () => {
  let router: Router;
  const state = {} as RouterStateSnapshot;
  const ruta = (rol?: string) => ({ data: rol ? { rol } : {} }) as unknown as ActivatedRouteSnapshot;
  const url = (r: unknown) => router.serializeUrl(r as UrlTree);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders(new FakeApi()) });
    router = TestBed.inject(Router);
  });

  const auth = () => TestBed.inject(AuthGuard).canActivate(ruta(), state);
  const rol = (r: 'reciclador' | 'generador') => TestBed.inject(RolGuard).canActivate(ruta(r), state);

  it('AuthGuard sin sesión redirige a /login', () => {
    const result = auth();
    expect(result).toBeInstanceOf(UrlTree);
    expect(url(result)).toBe('/login');
  });

  it('AuthGuard con JWT vigente permite el acceso', () => {
    login('rec@qhurinet.pe');
    expect(auth()).toBeTrue();
  });

  it('RolGuard sin sesión redirige a /login', () => {
    expect(url(rol('reciclador'))).toBe('/login');
  });

  it('RolGuard deja pasar al reciclador a sus pantallas', () => {
    login('rec@qhurinet.pe');
    expect(rol('reciclador')).toBeTrue();
  });

  it('RolGuard manda al reciclador que entra a una pantalla de generador a su Mapa', () => {
    login('rec@qhurinet.pe');
    expect(url(rol('generador'))).toBe('/app/mapa');
  });

  it('RolGuard manda al generador que entra a una pantalla de reciclador a Publicar', () => {
    login('gen@qhurinet.pe');
    expect(rol('generador')).toBeTrue();
    expect(url(rol('reciclador'))).toBe('/app/publicar');
  });
});
