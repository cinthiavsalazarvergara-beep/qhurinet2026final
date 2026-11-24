import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FakeApi } from '../../testing/fake-api';
import { routeWith, testProviders } from '../../testing/test-config';
import { LoginService } from '../../services/login-service';
import { AccesoComponent } from './acceso-component';

// Comportamiento del formulario de acceso (reactivo) contra la FakeApi.
describe('AccesoComponent', () => {
  let fixture: ComponentFixture<AccesoComponent>;
  let navigate: jasmine.Spy;

  function setup(mode: 'login' | 'register', account: string | null = null) {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AccesoComponent],
      providers: [...testProviders(new FakeApi()), routeWith(account ? { account } : {}, { mode })],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(AccesoComponent);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (s: string) => el().querySelector(s) as HTMLElement | null;
  const qa = (s: string) => Array.from(el().querySelectorAll(s)) as HTMLElement[];
  const alerts = () => qa('[role="alert"]').map((n) => n.textContent?.trim());

  function type(sel: string, value: string) {
    const input = q(sel) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
  function click(e: HTMLElement | null) {
    e?.click();
    fixture.detectChanges();
  }

  it('login: encabezado, botón y sin nombre/teléfono', () => {
    setup('login');
    expect(q('.flow-heading')?.textContent?.trim()).toBe('INICIAR SESIÓN');
    expect(q('.submit-button')?.textContent?.trim()).toBe('Entrar');
    expect(q('input[type="text"]')).toBeNull();
    expect(q('input[type="tel"]')).toBeNull();
  });

  it('registro: encabezado, botón y campos de nombre y teléfono', () => {
    setup('register');
    expect(q('.flow-heading')?.textContent?.trim()).toBe('CREAR CUENTA');
    expect(q('.submit-button')?.textContent?.trim()).toBe('Crear cuenta');
    expect(q('input[type="text"]')).not.toBeNull();
    expect(q('input[type="tel"]')).not.toBeNull();
  });

  it('login no pide tipo de cuenta (el rol lo dicta el servidor)', () => {
    setup('login');
    expect(qa('.account-card').length).toBe(0);
  });

  it('registro: dos tarjetas de cuenta con su rol', () => {
    setup('register');
    const cards = qa('.account-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('ENTRA COMO RECICLADOR');
    expect(cards[1].textContent).toContain('ENTRA COMO GENERADOR');
  });

  it('seleccionar una tarjeta marca aria-checked', () => {
    setup('register');
    click(qa('.account-card')[0]);
    expect(qa('.account-card')[0].getAttribute('aria-checked')).toBe('true');
  });

  it('preselecciona por ?account=bodega', () => {
    setup('register', 'bodega');
    expect(qa('.account-card')[1].getAttribute('aria-checked')).toBe('true');
  });

  it('usa formulario reactivo con campos de Angular Material', () => {
    setup('register');
    expect(qa('mat-form-field').length).toBe(4);
    expect(q('form.auth-card')).not.toBeNull();
    expect(q('button.submit-button')?.classList.contains('mat-mdc-unelevated-button')).toBeTrue();
  });

  it('login vacío muestra errores y no navega', () => {
    setup('login');
    click(q('.submit-button'));
    const msgs = alerts();
    expect(msgs).toContain('Ingresa un correo válido, como nombre@dominio.com.');
    expect(msgs).toContain('Ingresa tu contraseña (mínimo 8 caracteres).');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('escribir en un campo limpia su error', () => {
    setup('login');
    click(q('.submit-button'));
    type('input[type="email"]', 'rec@qhurinet.pe');
    expect(alerts()).not.toContain('Ingresa un correo válido, como nombre@dominio.com.');
  });

  it('login válido de reciclador navega a /app/mapa', () => {
    setup('login');
    type('input[type="email"]', 'rec@qhurinet.pe');
    type('input[type="password"]', 'Secreta123');
    click(q('.submit-button'));
    expect(navigate).toHaveBeenCalledWith(['/app', 'mapa']);
  });

  it('login válido de generador navega a /app/publicar', () => {
    setup('login');
    type('input[type="email"]', 'GEN@qhurinet.pe ');
    type('input[type="password"]', 'Secreta123');
    click(q('.submit-button'));
    expect(navigate).toHaveBeenCalledWith(['/app', 'publicar']);
  });

  it('login con contraseña incorrecta muestra el error del servidor y no navega', () => {
    setup('login');
    type('input[type="email"]', 'rec@qhurinet.pe');
    type('input[type="password"]', 'incorrecta1');
    click(q('.submit-button'));
    expect(alerts()).toContain('Correo o contraseña incorrectos.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('registro inválido muestra los mensajes de nombre, teléfono, contraseña y cuenta', () => {
    setup('register');
    type('input[type="text"]', 'Marco');
    type('input[type="email"]', 'ficticio@demo.pe');
    type('input[type="tel"]', '12345');
    type('input[type="password"]', '1234567');
    click(q('.submit-button'));
    const msgs = alerts();
    expect(msgs).toContain('Escribe tu nombre y apellidos.');
    expect(msgs).toContain('El teléfono debe tener 9 dígitos (formato peruano).');
    expect(msgs).toContain('La contraseña debe tener al menos 8 caracteres.');
    expect(msgs).toContain('Elige un tipo de cuenta para continuar.');
  });

  it('registro válido crea la cuenta, deja el aviso y lleva a /login', () => {
    setup('register');
    click(qa('.account-card')[1]);
    type('input[type="text"]', 'Ana Torres');
    type('input[type="email"]', 'ana@demo.pe');
    type('input[type="tel"]', '+51 987 654 321');
    type('input[type="password"]', 'clave1234');
    click(q('.submit-button'));
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(TestBed.inject(LoginService).aviso).toContain('confirmar tu correo');
  });

  it('registro con un correo repetido muestra el error del servidor', () => {
    setup('register');
    click(qa('.account-card')[0]);
    type('input[type="text"]', 'Ana Torres');
    type('input[type="email"]', 'repetido@qhurinet.pe');
    type('input[type="tel"]', '987654321');
    type('input[type="password"]', 'clave1234');
    click(q('.submit-button'));
    expect(alerts().join(' ')).toContain('ya está registrado');
  });

  it('muestra el aviso pendiente (p. ej. sesión vencida) al abrir el login', () => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [AccesoComponent], providers: [...testProviders(new FakeApi()), routeWith({}, { mode: 'login' })] });
    TestBed.inject(LoginService).aviso = 'Tu sesión venció. Inicia sesión de nuevo.';
    fixture = TestBed.createComponent(AccesoComponent);
    fixture.detectChanges();
    expect(q('[role="status"]')?.textContent).toContain('venció');
  });

  it('los botones de Google/Facebook están deshabilitados (OAuth sin configurar)', () => {
    setup('login');
    qa('.social-button').forEach((b) => expect((b as HTMLButtonElement).disabled).toBeTrue());
  });

  it('el enlace alterna login → /registro', () => {
    setup('login');
    click(q('.auth-link'));
    expect(navigate).toHaveBeenCalledWith(['/registro']);
  });

  it('Enter en un campo envía el formulario', () => {
    setup('login');
    type('input[type="email"]', 'rec@qhurinet.pe');
    type('input[type="password"]', 'Secreta123');
    q('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/app', 'mapa']);
  });
});
