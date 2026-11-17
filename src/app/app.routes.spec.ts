import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Api } from './core/api';
import { FakeApi } from './testing/fake-api';
import { AuthService } from './services/auth.service';

// Navegación real (no solo HTTP 200): monta el Router con las rutas de la app y
// comprueba qué pantalla se activa y cómo protege el guard a /app.
describe('rutas de la app', () => {
  let harness: RouterTestingHarness;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes, withComponentInputBinding()), { provide: Api, useValue: new FakeApi() }],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  const text = () => harness.routeNativeElement?.textContent ?? '';

  function login(account: 'ciudadano' | 'bodega') {
    auth.updateField('email', account === 'ciudadano' ? 'rec@qhurinet.pe' : 'gen@qhurinet.pe');
    auth.updateField('password', 'Secreta123');
    auth.login().subscribe();
  }

  it('/login activa la tarjeta de inicio de sesión', async () => {
    await harness.navigateByUrl('/login');
    expect(text()).toContain('INICIAR SESIÓN');
  });

  it('/registro activa la tarjeta de registro', async () => {
    await harness.navigateByUrl('/registro');
    expect(text()).toContain('CREAR CUENTA');
  });

  it('la raíz redirige a /login', async () => {
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/login');
  });

  it('/app sin sesión redirige a /login (guard)', async () => {
    await harness.navigateByUrl('/app');
    expect(router.url).toBe('/login');
  });

  it('/app con sesión de reciclador abre el Mapa', async () => {
    login('ciudadano');
    await harness.navigateByUrl('/app');
    expect(router.url).toBe('/app/mapa');
    expect(text()).toContain('Materiales disponibles');
  });

  it('/app/publicar con sesión de generador abre Publicar', async () => {
    login('bodega');
    await harness.navigateByUrl('/app/publicar');
    expect(router.url).toBe('/app/publicar');
    expect(text()).toContain('Anunciar material');
  });

  it('un reciclador que escribe /app/publicar vuelve a su Mapa (guard por rol)', async () => {
    login('ciudadano');
    await harness.navigateByUrl('/app/publicar');
    expect(router.url).toBe('/app/mapa');
  });

  it('un generador que escribe /app/mapa o /app/recojos vuelve a Publicar (guard por rol)', async () => {
    login('bodega');
    await harness.navigateByUrl('/app/mapa');
    expect(router.url).toBe('/app/publicar');
    await harness.navigateByUrl('/app/recojos');
    expect(router.url).toBe('/app/publicar');
  });

  it('/verify-email sin token muestra el error', async () => {
    await harness.navigateByUrl('/verify-email');
    expect(text()).toContain('no incluye el token');
  });

  it('/app/recojos abre la tabla de recojos', async () => {
    login('ciudadano');
    await harness.navigateByUrl('/app/recojos');
    expect(text()).toContain('MATERIAL / LUGAR');
  });

  it('las pestañas de Recojos filtran la tabla', async () => {
    login('ciudadano');
    await harness.navigateByUrl('/app/recojos');
    harness.fixture.detectChanges();
    const root = harness.routeNativeElement as HTMLElement;
    const tab = (k: string) => root.querySelector(`[data-tab="${k}"]`) as HTMLButtonElement;
    expect(tab('activos').textContent).toContain('Activos · 3');
    expect(tab('completados').textContent).toContain('Completados · 1');
    expect(root.textContent).toContain('Generador 2');
    expect(root.textContent).not.toContain('Generador 4');
    tab('completados').click();
    harness.fixture.detectChanges();
    expect(root.textContent).toContain('Generador 4');
    expect(root.textContent).not.toContain('Generador 2');
    tab('cancelados').click();
    harness.fixture.detectChanges();
    expect(root.textContent).toContain('No hay entregas canceladas.');
  });
});
