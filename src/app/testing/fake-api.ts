import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import * as D from '../core/api.models';

const fail = (status: number, message: string) => throwError(() => new HttpErrorResponse({ status, error: { code: 'ERR', message } }));
const iso = (d: string) => d + 'T10:00:00';

/**
 * Backend en memoria para las pruebas del store: replica las reglas del servidor (estados de la
 * solicitud, código QR, límites de franja) con datos de muestra, sin red. Reemplaza a `Api`.
 */
export class FakeApi {
  me$: D.PerfilUsuarioDTO = {
    id: 7, nombreCompleto: 'Marco Quispe', email: 'marco@qhurinet.pe', telefono: '987654321', fotoPerfilUrl: null, descripcion: 'Reciclador',
    metodoPagoPreferido: 'efectivo', enLinea: true, calificacionPromedio: 4.8, estado: 'activo', rolId: 2, rolNombre: 'recolector',
    materiales: [{ id: 1, nombre: 'cartón', unidadMedidaDefault: 'kg' }], verificado: true,
    metodosPago: [{ id: 1, tipo: 'efectivo', dato: null, predeterminado: true }],
  };
  categoriesList: D.CategoriaMaterialDTO[] = [['cartón', 1], ['PET', 2], ['vidrio', 3], ['metal', 4], ['plástico', 5]].map(([nombre, id]) => ({ id: id as number, nombre: nombre as string, unidadMedidaDefault: 'kg' }));
  pubs: D.PublicacionDTO[] = [1, 2, 3, 4].map((id) => ({
    id, categoriaMaterialId: 1, categoriaMaterialNombre: id === 3 ? 'vidrio' : 'cartón', cantidad: 10 * id, unidadMedida: 'kg', descripcion: '', estado: id <= 2 ? 'reservado' : 'disponible',
    fotoUrl: null, direccion: 'Av. Prueba ' + id, distrito: 'Magdalena', latitud: -12.09 - id / 100, longitud: -77.05, fechaDisponibilidad: '2030-01-01', fechaPublicacion: iso('2030-01-01'),
    generadorId: 20 + id, generadorNombreCompleto: 'Generador ' + id, franjaHoraria: 'tarde', montoPago: null, metodoPago: null,
  }));
  reqs: D.MiSolicitudDTO[] = [
    { id: 1, cantidad: 10, material: 'cartón', direccion: 'Av. Prueba 1', estado: 'coordinada', prioritaria: false, contraparte: 'Generador 1', fechaCoordinada: iso('2030-01-02'), publicacionId: 1, franjaHoraria: 'tarde', unidadMedida: 'kg' },
    { id: 2, cantidad: 20, material: 'cartón', direccion: 'Av. Prueba 2', estado: 'creada', prioritaria: false, contraparte: 'Generador 2', fechaCoordinada: null, publicacionId: 2, franjaHoraria: null, unidadMedida: 'kg' },
    { id: 3, cantidad: 30, material: 'vidrio', direccion: 'Av. Prueba 3', estado: 'coordinada', prioritaria: false, contraparte: 'Generador 3', fechaCoordinada: iso('2030-01-03'), publicacionId: 3 + 100, franjaHoraria: 'manana', unidadMedida: 'kg' },
    { id: 4, cantidad: 5, material: 'metal', direccion: 'Av. Prueba 4', estado: 'ejecutada', prioritaria: false, contraparte: 'Generador 4', fechaCoordinada: iso('2029-12-01'), publicacionId: 4 + 100, franjaHoraria: 'noche', unidadMedida: 'kg' },
  ];
  mine: D.MiPublicacionDTO[] = [];
  messagesBy: Record<number, D.MensajeDTO[]> = { 1: [{ id: 1, contenido: 'Hola', fechaEnvio: iso('2030-01-01'), remitenteId: 21 }] };
  notifs: D.NotificacionDTO[] = [
    { id: 1, mensaje: 'Tu recojo fue coordinado. Revisa los detalles', leida: false, fechaCreacion: iso('2030-01-01') },
    { id: 2, mensaje: 'Nuevo anuncio cerca de ti', leida: false, fechaCreacion: iso('2030-01-01') },
  ];
  tickets$: D.TicketSoporteDTO[] = [];
  calls: string[] = [];
  private nextId = 100;
  private find(id: number) { return this.reqs.find((r) => r.id === id); }
  private sol(r: D.MiSolicitudDTO): D.SolicitudDTO { return { id: r.id, publicacionId: r.publicacionId ?? 0, estado: r.estado, prioritaria: r.prioritaria, fechaCoordinada: r.fechaCoordinada, franjaHoraria: r.franjaHoraria }; }

  login(email: string, password: string): Observable<D.AuthResponseDTO> {
    if (password !== 'Secreta123') return fail(401, 'Credenciales inválidas');
    const gen = email.startsWith('gen');
    const usuario = { id: gen ? 21 : 7, nombreCompleto: gen ? 'Generador Uno' : 'Marco Quispe', email, rolId: gen ? 1 : 2, rolNombre: gen ? 'generador' : 'recolector', estado: 'activo' };
    const payload = btoa(JSON.stringify({ sub: email, rol: gen ? 'ROLE_generador' : 'ROLE_recolector', exp: Math.floor(Date.now() / 1000) + 1200 }));
    return of({ token: 'h.' + payload + '.s', usuario });
  }
  register(body: D.RegistrarUsuarioDTO): Observable<D.UsuarioDTO> {
    if (body.email === 'repetido@qhurinet.pe') return fail(409, 'El correo ya está registrado');
    return of({ id: 50, nombreCompleto: body.nombreCompleto, email: body.email, rolId: body.rolId, rolNombre: body.rolId === 1 ? 'generador' : 'recolector', estado: 'pendiente_verificacion' });
  }
  verifyEmail(token: string): Observable<D.UsuarioDTO> { return token === 'ok' ? of({ id: 50, nombreCompleto: 'X', email: 'x@y.pe', rolId: 2, rolNombre: 'recolector', estado: 'activo' }) : fail(400, 'Token inválido'); }

  me() { return of(this.me$); }
  updateMe(b: D.ActualizarPerfilDTO) { this.me$ = { ...this.me$, nombreCompleto: b.nombreCompleto, telefono: b.telefono, descripcion: b.descripcion }; return of(this.me$); }
  setAvailability(enLinea: boolean) { this.me$ = { ...this.me$, enLinea }; return of({ enLinea }); }
  savePaymentMethods(m: D.MetodoPagoUsuarioDTO[]) { this.me$ = { ...this.me$, metodosPago: m.map((x, i) => ({ ...x, id: x.id ?? 50 + i })) }; return of({}); }
  uploadAvatar() { return of({ fotoPerfilUrl: '/a.png' }); }
  reputation(id: number) { return of({ id, nombreCompleto: 'Contraparte', calificacionPromedio: 4.5, totalEntregas: 12, verificado: true }); }
  documents() { return of<D.DocumentoVerificacionDTO[]>([]); }
  uploadDocument(tipo: string) { return of({ id: 1, tipo, urlArchivo: '/d.pdf', estado: 'aprobado', fechaSubida: iso('2030-01-01') }); }
  categories() { return of(this.categoriesList); }
  points() { return of<D.PuntoReciclajeDTO[]>([{ id: 1, nombre: 'Punto Verde', tipo: 'acopio', direccion: 'Jr. Prueba 1', distrito: 'Lince', latitud: -12.08, longitud: -77.03, horarioAtencion: '8-18', calificacionPromedio: 4.2, materiales: [{ id: 1, nombre: 'cartón', unidadMedidaDefault: 'kg' }] }]); }

  publications() { return of(this.pubs.filter((p) => p.estado === 'disponible')); }
  publication(id: number) { const p = this.pubs.find((x) => x.id === id); return p ? of(p) : fail(404, 'No existe'); }
  myPublications() { return of(this.mine); }
  createPublication(b: D.CrearPublicacionDTO) {
    this.calls.push('createPublication');
    const id = this.nextId++;
    this.mine = [{ id, cantidad: b.cantidad, material: 'PET', fechaPublicacion: iso('2030-01-01'), estado: 'disponible', reciclador: null, fechaCoordinada: null, solicitudId: null, franjaHoraria: b.franjaHoraria, unidadMedida: 'kg' }, ...this.mine];
    return of({ ...this.pubs[2], id });
  }
  cancelPublication(id: number) { this.mine = this.mine.map((p) => (p.id === id ? { ...p, estado: 'cancelado' } : p)); return of(this.pubs[0]); }

  claim(publicacionId: number) {
    const p = this.pubs.find((x) => x.id === publicacionId);
    if (!p || p.estado !== 'disponible') return fail(409, 'La publicación ya no está disponible');
    p.estado = 'reservado';
    const id = this.nextId++;
    this.reqs.push({ id, cantidad: p.cantidad, material: p.categoriaMaterialNombre, direccion: p.direccion, estado: 'creada', prioritaria: false, contraparte: p.generadorNombreCompleto, fechaCoordinada: null, publicacionId: p.id, franjaHoraria: null, unidadMedida: 'kg' });
    return of({ id, publicacionId: p.id, estado: 'creada', prioritaria: false, fechaCoordinada: null, franjaHoraria: null });
  }
  requests() { return of([...this.reqs]); }
  requestDetail(id: number) { const r = this.find(id)!; return of({ solicitud: this.sol(r), generadorId: 21, recolectorId: 7, contraparte: r.contraparte, material: r.material, cantidad: r.cantidad, unidadMedida: 'kg', direccion: r.direccion }); }
  coordinate(id: number, fecha: string, franja: string) { const r = this.find(id)!; if (r.estado !== 'creada') return fail(409, 'Solo se coordina una solicitud creada'); return this.setDate(r, fecha, franja); }
  reschedule(id: number, fecha: string, franja: string) { const r = this.find(id)!; if (['ejecutada', 'cancelada'].includes(r.estado)) return fail(409, 'No admite reprogramación'); return this.setDate(r, fecha, franja); }
  private setDate(r: D.MiSolicitudDTO, fecha: string, franja: string) { r.fechaCoordinada = fecha; r.franjaHoraria = franja; r.estado = 'coordinada'; return of(this.sol(r)); }
  cancelRequest(id: number) { const r = this.find(id)!; r.estado = 'cancelada'; return of(this.sol(r)); }
  setPriority(id: number, prioritaria: boolean) { const r = this.find(id)!; r.prioritaria = prioritaria; return of(this.sol(r)); }
  start(id: number) { const r = this.find(id)!; if (r.estado !== 'coordinada') return fail(409, 'La recolección debe estar coordinada'); r.estado = 'en_camino'; return of(this.sol(r)); }
  qr(id: number) { return of({ codigoQr: 'QH-R' + id, qrValidado: false }); }
  private validated = new Set<number>();
  validateQr(id: number, codigo: string) { if (codigo !== 'QH-R' + id) return fail(409, 'Código no válido para esta recolección'); this.validated.add(id); return of({}); }
  confirm(id: number) { const r = this.find(id)!; if (!this.validated.has(id)) return fail(409, 'Valide el código'); r.estado = 'ejecutada'; return of(this.sol(r)); }
  rate(id: number, n: number) { this.calls.push('rate:' + id + ':' + n); return of({}); }
  tracking(id: number) { return of({ solicitudId: id, estado: 'en_camino', recolector: 'Marco', destino: 'x', minutosEstimados: 7, latitudActual: null, longitudActual: null }); }

  messages(id: number) { return of(this.messagesBy[id] ?? []); }
  sendMessage(id: number, contenido: string) {
    const m = { id: this.nextId++, contenido, fechaEnvio: iso('2030-01-01'), remitenteId: 7 };
    this.messagesBy[id] = [...(this.messagesBy[id] ?? []), m];
    return of(m);
  }
  notifications() { return of([...this.notifs]); }
  readNotification(id: number) { this.notifs = this.notifs.map((n) => (n.id === id ? { ...n, leida: true } : n)); return of({}); }
  readAllNotifications() { this.notifs = this.notifs.map((n) => ({ ...n, leida: true })); return of({}); }
  faqs() { return of<D.FaqDTO[]>([{ pregunta: '¿Cómo reclamo?', respuesta: 'Con el botón Reclamar.' }]); }
  tickets() { return of([...this.tickets$]); }
  createTicket(b: D.CrearTicketDTO) {
    const t: D.TicketSoporteDTO = { id: this.nextId++, categoria: b.categoria, estado: 'abierto', asunto: b.asunto, descripcion: b.descripcion, evidenciaUrl: null, fechaCreacion: iso('2030-01-01') };
    this.tickets$ = [t, ...this.tickets$];
    return of(t);
  }
  uploadEvidence(id: number) { this.tickets$ = this.tickets$.map((t) => (t.id === id ? { ...t, evidenciaUrl: '/e.jpg' } : t)); return of({}); }
  summary() { return of({ kgTotales: 177.6, totalRecojos: 30, calificacionPromedio: 4.9, cumplimiento: 98 }); }
  materialsReport() { return of<D.ReporteMaterialDTO[]>([{ material: 'plástico', kilos: 18, recolecciones: 3, cantidadTotal: 18, unidadMedida: 'kg' }, { material: 'vidrio', kilos: 9, recolecciones: 1, cantidadTotal: 9, unidadMedida: 'kg' }]); }
  history() { return of<D.HistorialDTO[]>([{ fecha: iso('2030-01-01'), material: 'cartón', cantidad: 10, contraparte: 'Emilia Valencia', calificacionRecolector: 5, estado: 'ejecutada', montoPago: null, solicitudId: 4, unidadMedida: 'kg' }]); }
  exportHistory() { return of(new Blob(['x'])); }
}
