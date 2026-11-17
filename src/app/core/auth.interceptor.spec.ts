import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Api, API_URL } from './api';
import { authInterceptor } from './auth.interceptor';

// El interceptor agrega el JWT a las llamadas a la API y cierra sesión ante un 401.
describe('authInterceptor', () => {
  let http: HttpTestingController;
  let api: Api;
  let auth: AuthService;
  const BASE = 'http://api.test/api/v1';

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
        { provide: API_URL, useValue: BASE }, { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(Api);
    auth = TestBed.inject(AuthService);
  });

  const login = () => {
    auth.updateField('email', 'rec@qhurinet.pe');
    auth.updateField('password', 'Secreta123');
    auth.login().subscribe();
    const req = http.expectOne(BASE + '/auth/login');
    const token = 'h.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })) + '.s';
    req.flush({ token, usuario: { id: 1, nombreCompleto: 'Marco', email: 'rec@qhurinet.pe', rolId: 2, rolNombre: 'recolector', estado: 'activo' } });
    return token;
  };

  it('el login usa la URL del environment y no lleva Authorization', () => {
    auth.updateField('email', 'rec@qhurinet.pe');
    auth.updateField('password', 'Secreta123');
    auth.login().subscribe();
    const req = http.expectOne(BASE + '/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.body).toEqual({ email: 'rec@qhurinet.pe', password: 'Secreta123' });
  });

  it('con sesión, las llamadas a la API llevan Authorization: Bearer', () => {
    const token = login();
    api.me().subscribe();
    const req = http.expectOne(BASE + '/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
  });

  it('no agrega el token a URLs ajenas a la API', () => {
    login();
    TestBed.inject(HttpClient).get('http://otro-dominio.test/dato').subscribe();
    const req = http.expectOne('http://otro-dominio.test/dato');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('un 401 en la API cierra la sesión y manda al login', () => {
    login();
    api.me().subscribe({ error: () => undefined });
    http.expectOne(BASE + '/users/me').flush({ message: 'expirado' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
  });

  it('un 401 en el login (credenciales malas) no dispara el cierre de sesión', () => {
    auth.updateField('email', 'rec@qhurinet.pe');
    auth.updateField('password', 'incorrecta1');
    auth.login().subscribe();
    http.expectOne(BASE + '/auth/login').flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.serverError()).toBe('Correo o contraseña incorrectos.');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
});
