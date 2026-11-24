import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { FakeApi } from './testing/fake-api';
import { login, testProviders } from './testing/test-config';

// Navegación real: monta el Router con las rutas de la app y comprueba qué pantalla se
// activa en cada ruta y cómo la protegen AuthGuard y RolGuard.
describe('rutas de la app', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: testProviders(new FakeApi(), routes) });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  const text = () => (harness.fixture.nativeElement as HTMLElement).textContent ?? '';
  const ir = async (url: string) => {
    await harness.navigateByUrl(url);
    harness.fixture.detectChanges();
  };

  it('/login activa la tarjeta de inicio de sesión', async () => {
    await ir('/login');
    expect(text()).toContain('INICIAR SESIÓN');
  });

  it('/registro activa la tarjeta de registro', async () => {
    await ir('/registro');
    expect(text()).toContain('CREAR CUENTA');
  });

  it('la raíz redirige a /login', async () => {
    await ir('/');
    expect(router.url).toBe('/login');
  });

  it('/app sin sesión redirige a /login (guard)', async () => {
    await ir('/app');
    expect(router.url).toBe('/login');
  });

  it('/verify-email sin token muestra el error', async () => {
    await ir('/verify-email');
    expect(text()).toContain('no incluye el token');
  });

  it('/app con sesión de reciclador abre el Mapa', async () => {
    login('rec@qhurinet.pe');
    await ir('/app');
    expect(router.url).toBe('/app/mapa');
    expect(text()).toContain('Materiales disponibles');
    expect(text()).toContain('RUTA ACTIVA');
  });

  it('/app/recojos abre la tabla de recojos', async () => {
    login('rec@qhurinet.pe');
    await ir('/app/recojos');
    expect(text()).toContain('MATERIAL / LUGAR');
    expect(text()).toContain('Mis recojos');
  });

  it('/app/publicar con sesión de generador abre Publicar', async () => {
    login('gen@qhurinet.pe');
    await ir('/app/publicar');
    expect(router.url).toBe('/app/publicar');
    expect(text()).toContain('Anunciar material');
  });

  it('/app/publicaciones con sesión de generador abre la tabla de anuncios', async () => {
    login('gen@qhurinet.pe');
    await ir('/app/publicaciones');
    expect(text()).toContain('MATERIAL / PUBLICADO');
  });

  it('/app/chats, /app/perfil y /app/soporte abren su pantalla', async () => {
    login('rec@qhurinet.pe');
    await ir('/app/chats');
    expect(text()).toContain('Mensajes');
    expect(text()).toContain('CONTRAPARTE');
    await ir('/app/perfil');
    expect(text()).toContain('Mi perfil');
    expect(text()).toContain('Historial de actividad');
    await ir('/app/soporte');
    expect(text()).toContain('Preguntas frecuentes');
  });

  it('un reciclador que escribe /app/publicar vuelve a su Mapa (guard por rol)', async () => {
    login('rec@qhurinet.pe');
    await ir('/app/publicar');
    expect(router.url).toBe('/app/mapa');
  });

  it('un generador que escribe /app/mapa o /app/recojos vuelve a Publicar (guard por rol)', async () => {
    login('gen@qhurinet.pe');
    await ir('/app/mapa');
    expect(router.url).toBe('/app/publicar');
    await ir('/app/recojos');
    expect(router.url).toBe('/app/publicar');
  });

  it('la barra lateral muestra las pestañas del rol', async () => {
    login('gen@qhurinet.pe');
    await ir('/app/publicar');
    const labels = Array.from((harness.fixture.nativeElement as HTMLElement).querySelectorAll('.nav-label')).map((n) => n.textContent?.trim());
    expect(labels).toEqual(['PUBLICAR', 'ANUNCIOS', 'CHATS', 'PERFIL', 'SOPORTE']);
  });

  it('las pestañas de Recojos filtran la tabla', async () => {
    login('rec@qhurinet.pe');
    await ir('/app/recojos');
    const root = harness.fixture.nativeElement as HTMLElement;
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
