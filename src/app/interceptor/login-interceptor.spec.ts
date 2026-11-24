import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginService } from '../services/login-service';
import { PerfilService } from '../services/perfil-service';
import { loginInterceptor } from './login-interceptor';

// El interceptor agrega el JWT a las llamadas a la API y cierra sesión ante un 401.
describe('loginInterceptor', () => {
  let http: HttpTestingController;
  let loginService: LoginService;
  let router: Router;
  const BASE = environment.apiUrl;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([loginInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    loginService = TestBed.inject(LoginService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => http.verify());

  const usuario = { id: 1, nombreCompleto: 'Marco', email: 'rec@qhurinet.pe', rolId: 2, rolNombre: 'recolector', estado: 'activo' };
  const login = () => {
    loginService.login({ email: 'rec@qhurinet.pe', password: 'Secreta123' }).subscribe();
    const token = 'h.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })) + '.s';
    http.expectOne(BASE + '/auth/login').flush({ token, usuario }, { headers: { Authorization: token } });
    return token;
  };

  it('el login usa la URL del environment, no lleva Authorization y guarda el token del header', () => {
    loginService.login({ email: 'rec@qhurinet.pe', password: 'Secreta123' }).subscribe();
    const req = http.expectOne(BASE + '/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.body).toEqual({ email: 'rec@qhurinet.pe', password: 'Secreta123' });
    req.flush({ token: 'cuerpo.x.y', usuario }, { headers: { Authorization: 'Bearer h.e30.s' } });
    expect(loginService.getToken()).toBe('h.e30.s');
  });

  it('con sesión, las llamadas a la API llevan Authorization: Bearer', () => {
    const token = login();
    TestBed.inject(PerfilService).me().subscribe();
    const req = http.expectOne(BASE + '/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + token);
    req.flush({});
  });

  it('no agrega el token a URLs ajenas a la API', () => {
    login();
    TestBed.inject(HttpClient).get('http://otro-dominio.test/dato').subscribe();
    const req = http.expectOne('http://otro-dominio.test/dato');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('un 401 en la API cierra la sesión y manda al login', () => {
    login();
    TestBed.inject(PerfilService).me().subscribe({ error: () => undefined });
    http.expectOne(BASE + '/users/me').flush({ message: 'expirado' }, { status: 401, statusText: 'Unauthorized' });
    expect(loginService.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('un 401 en el login (credenciales malas) no dispara el cierre de sesión', () => {
    let status = 0;
    loginService.login({ email: 'rec@qhurinet.pe', password: 'incorrecta1' }).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(BASE + '/auth/login').flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
