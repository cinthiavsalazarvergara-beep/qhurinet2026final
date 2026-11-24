import { HttpErrorResponse, HttpHeaders, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { FakeApi } from './fake-api';

/**
 * Interceptor SOLO para pruebas: en vez de salir a la red, cada petición a la API se
 * resuelve con la FakeApi en memoria. Así las pruebas usan los servicios reales
 * (URL, método y cuerpo incluidos) sin levantar el backend.
 *
 * Uso: provideHttpClient(withInterceptors([loginInterceptor, fakeBackend(api)]))
 */
export function fakeBackend(api: FakeApi): HttpInterceptorFn {
  return (req, next) => {
    if (!req.url.startsWith(environment.apiUrl)) return next(req);
    const path = req.url.slice(environment.apiUrl.length);
    api.log.push(req.method + ' ' + path);
    const call = route(api, req, path);
    if (!call) {
      return throwError(() => new HttpErrorResponse({ status: 404, url: req.url, error: { message: 'Ruta no simulada: ' + req.method + ' ' + path } }));
    }
    const headers = path === '/auth/login' ? (body: unknown) => new HttpHeaders({ Authorization: (body as { token: string }).token }) : () => new HttpHeaders();
    return call.pipe(map((body) => new HttpResponse({ status: 200, url: req.url, body, headers: headers(body) })));
  };
}

function route(api: FakeApi, req: HttpRequest<unknown>, path: string): Observable<unknown> | null {
  const b = (req.body ?? {}) as Record<string, any>;
  const m = req.method;
  const id = (re: RegExp) => Number(path.match(re)?.[1]);
  const is = (method: string, re: RegExp) => m === method && re.test(path);

  // Autenticación
  if (is('POST', /^\/auth\/login$/)) return api.login(b['email'], b['password']);
  if (is('POST', /^\/auth\/register$/)) return api.register(b as never);
  if (is('POST', /^\/auth\/verify-email$/)) return api.verifyEmail(b['token']);
  // Perfil y documentos
  if (is('GET', /^\/users\/me$/)) return api.me();
  if (is('PUT', /^\/users\/me$/)) return api.updateMe(b as never);
  if (is('PATCH', /^\/users\/me\/availability$/)) return api.setAvailability(b['enLinea']);
  if (is('PATCH', /^\/users\/me\/payment-method$/)) return api.savePaymentMethods(b['metodos']);
  if (is('POST', /^\/users\/me\/avatar$/)) return api.uploadAvatar();
  if (is('GET', /^\/users\/me\/documents$/)) return api.documents();
  if (is('POST', /^\/users\/me\/documents$/)) return api.uploadDocument(String((req.body as FormData).get('tipo')));
  if (is('GET', /^\/users\/(\d+)\/reputation$/)) return api.reputation(id(/^\/users\/(\d+)/));
  // Catálogos
  if (is('GET', /^\/material-categories$/)) return api.categories();
  if (is('GET', /^\/recycling-points$/)) return api.points();
  // Publicaciones
  if (is('GET', /^\/publications\/mine$/)) return api.myPublications();
  if (is('GET', /^\/publications\/(\d+)$/)) return api.publication(id(/^\/publications\/(\d+)/));
  if (is('GET', /^\/publications$/)) return api.publications();
  if (is('POST', /^\/publications$/)) return api.createPublication(b as never);
  if (is('PATCH', /^\/publications\/(\d+)\/cancel$/)) return api.cancelPublication(id(/^\/publications\/(\d+)/));
  // Solicitudes de recolección
  const sid = id(/^\/collection-requests\/(\d+)/);
  if (is('POST', /^\/collection-requests$/)) return api.claim(b['publicacionId']);
  if (is('GET', /^\/collection-requests$/)) return api.requests();
  if (is('GET', /^\/collection-requests\/\d+$/)) return api.requestDetail(sid);
  if (is('PATCH', /^\/collection-requests\/\d+\/coordinate$/)) return api.coordinate(sid, b['fechaCoordinada'], b['franjaHoraria']);
  if (is('PATCH', /^\/collection-requests\/\d+\/reschedule$/)) return api.reschedule(sid, b['fechaCoordinada'], b['franjaHoraria']);
  if (is('PATCH', /^\/collection-requests\/\d+\/cancel$/)) return api.cancelRequest(sid);
  if (is('PATCH', /^\/collection-requests\/\d+\/priority$/)) return api.setPriority(sid, b['prioritaria']);
  if (is('PATCH', /^\/collection-requests\/\d+\/start$/)) return api.start(sid);
  if (is('GET', /^\/collection-requests\/\d+\/qr$/)) return api.qr(sid);
  if (is('POST', /^\/collection-requests\/\d+\/validate-qr$/)) return api.validateQr(sid, b['codigo']);
  if (is('POST', /^\/collection-requests\/\d+\/confirm$/)) return api.confirm(sid, b['codigo']);
  if (is('POST', /^\/collection-requests\/\d+\/rating$/)) return api.rate(sid, b['calificacion']);
  if (is('GET', /^\/collection-requests\/\d+\/tracking$/)) return api.tracking(sid);
  if (is('GET', /^\/collection-requests\/\d+\/messages$/)) return api.messages(sid);
  if (is('POST', /^\/collection-requests\/\d+\/messages$/)) return api.sendMessage(sid, b['contenido']);
  // Notificaciones
  if (is('GET', /^\/notifications$/)) return api.notifications();
  if (is('PATCH', /^\/notifications\/read-all$/)) return api.readAllNotifications();
  if (is('PATCH', /^\/notifications\/(\d+)\/read$/)) return api.readNotification(id(/^\/notifications\/(\d+)/));
  // Soporte
  if (is('GET', /^\/faqs$/)) return api.faqs();
  if (is('GET', /^\/support-tickets$/)) return api.tickets();
  if (is('POST', /^\/support-tickets$/)) return api.createTicket(b as never);
  if (is('POST', /^\/support-tickets\/(\d+)\/evidence$/)) return api.uploadEvidence(id(/^\/support-tickets\/(\d+)/));
  // Reportes
  if (is('GET', /^\/reports\/summary$/)) return api.summary();
  if (is('GET', /^\/reports\/materials$/)) return api.materialsReport();
  if (is('GET', /^\/history$/)) return api.history();
  if (is('GET', /^\/reports\/export$/)) return api.exportHistory();
  return null;
}
