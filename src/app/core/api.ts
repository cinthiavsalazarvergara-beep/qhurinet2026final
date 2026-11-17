import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import * as D from './api.models';

/** URL base de la API. Sale del environment; los tests pueden sobreescribirla. */
export const API_URL = new InjectionToken<string>('API_URL', { providedIn: 'root', factory: () => environment.apiUrl });

/** Cliente HTTP tipado: un método por endpoint del backend (END-xx). */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_URL);
  private u(path: string): string { return this.base + path; }

  // --- Autenticación (END-01, END-02, END-04)
  login(email: string, password: string): Observable<D.AuthResponseDTO> { return this.http.post<D.AuthResponseDTO>(this.u('/auth/login'), { email, password }); }
  register(body: D.RegistrarUsuarioDTO): Observable<D.UsuarioDTO> { return this.http.post<D.UsuarioDTO>(this.u('/auth/register'), body); }
  verifyEmail(token: string): Observable<D.UsuarioDTO> { return this.http.post<D.UsuarioDTO>(this.u('/auth/verify-email'), { token }); }

  // --- Perfil
  me(): Observable<D.PerfilUsuarioDTO> { return this.http.get<D.PerfilUsuarioDTO>(this.u('/users/me')); }
  updateMe(body: D.ActualizarPerfilDTO): Observable<D.PerfilUsuarioDTO> { return this.http.put<D.PerfilUsuarioDTO>(this.u('/users/me'), body); }
  setAvailability(enLinea: boolean): Observable<{ enLinea: boolean }> { return this.http.patch<{ enLinea: boolean }>(this.u('/users/me/availability'), { enLinea }); }
  /** Reemplaza la lista completa de métodos de pago (exactamente uno predeterminado). */
  savePaymentMethods(metodos: D.MetodoPagoUsuarioDTO[]): Observable<unknown> { return this.http.patch(this.u('/users/me/payment-method'), { metodos }); }
  uploadAvatar(file: File): Observable<{ fotoPerfilUrl: string }> {
    const f = new FormData(); f.append('archivo', file);
    return this.http.post<{ fotoPerfilUrl: string }>(this.u('/users/me/avatar'), f);
  }
  reputation(userId: number): Observable<D.ReputacionDTO> { return this.http.get<D.ReputacionDTO>(this.u(`/users/${userId}/reputation`)); }
  documents(): Observable<D.DocumentoVerificacionDTO[]> { return this.http.get<D.DocumentoVerificacionDTO[]>(this.u('/users/me/documents')); }
  uploadDocument(tipo: string, file: File): Observable<D.DocumentoVerificacionDTO> {
    const f = new FormData(); f.append('tipo', tipo); f.append('archivo', file);
    return this.http.post<D.DocumentoVerificacionDTO>(this.u('/users/me/documents'), f);
  }

  // --- Catálogos
  categories(): Observable<D.CategoriaMaterialDTO[]> { return this.http.get<D.CategoriaMaterialDTO[]>(this.u('/material-categories')); }
  points(): Observable<D.PuntoReciclajeDTO[]> { return this.http.get<D.PuntoReciclajeDTO[]>(this.u('/recycling-points')); }

  // --- Publicaciones (generador)
  publications(estado?: string): Observable<D.PublicacionDTO[]> {
    let p = new HttpParams(); if (estado) p = p.set('estado', estado);
    return this.http.get<D.PublicacionDTO[]>(this.u('/publications'), { params: p });
  }
  myPublications(): Observable<D.MiPublicacionDTO[]> { return this.http.get<D.MiPublicacionDTO[]>(this.u('/publications/mine')); }
  createPublication(body: D.CrearPublicacionDTO): Observable<D.PublicacionDTO> { return this.http.post<D.PublicacionDTO>(this.u('/publications'), body); }
  cancelPublication(id: number, motivo: string): Observable<D.PublicacionDTO> { return this.http.patch<D.PublicacionDTO>(this.u(`/publications/${id}/cancel`), { motivo }); }

  // --- Solicitudes de recolección
  claim(publicacionId: number): Observable<D.SolicitudDTO> { return this.http.post<D.SolicitudDTO>(this.u('/collection-requests'), { publicacionId }); }
  requests(estado?: string): Observable<D.MiSolicitudDTO[]> {
    let p = new HttpParams(); if (estado) p = p.set('estado', estado);
    return this.http.get<D.MiSolicitudDTO[]>(this.u('/collection-requests'), { params: p });
  }
  requestDetail(id: number): Observable<D.DetalleSolicitudDTO> { return this.http.get<D.DetalleSolicitudDTO>(this.u(`/collection-requests/${id}`)); }
  coordinate(id: number, fechaCoordinada: string, franjaHoraria: string): Observable<D.SolicitudDTO> { return this.http.patch<D.SolicitudDTO>(this.u(`/collection-requests/${id}/coordinate`), { fechaCoordinada, franjaHoraria }); }
  reschedule(id: number, fechaCoordinada: string, franjaHoraria: string): Observable<D.SolicitudDTO> { return this.http.patch<D.SolicitudDTO>(this.u(`/collection-requests/${id}/reschedule`), { fechaCoordinada, franjaHoraria }); }
  cancelRequest(id: number, motivo: string): Observable<D.SolicitudDTO> { return this.http.patch<D.SolicitudDTO>(this.u(`/collection-requests/${id}/cancel`), { motivo }); }
  setPriority(id: number, prioritaria: boolean): Observable<D.SolicitudDTO> { return this.http.patch<D.SolicitudDTO>(this.u(`/collection-requests/${id}/priority`), { prioritaria }); }
  start(id: number): Observable<D.SolicitudDTO> { return this.http.patch<D.SolicitudDTO>(this.u(`/collection-requests/${id}/start`), {}); }
  qr(id: number): Observable<D.CodigoQrDTO> { return this.http.get<D.CodigoQrDTO>(this.u(`/collection-requests/${id}/qr`)); }
  validateQr(id: number, codigo: string): Observable<unknown> { return this.http.post(this.u(`/collection-requests/${id}/validate-qr`), { codigo }); }
  confirm(id: number): Observable<D.SolicitudDTO> { return this.http.post<D.SolicitudDTO>(this.u(`/collection-requests/${id}/confirm`), {}); }
  rate(id: number, calificacion: number, comentario = ''): Observable<unknown> { return this.http.post(this.u(`/collection-requests/${id}/rating`), { calificacion, comentario }); }
  tracking(id: number): Observable<D.SeguimientoDTO> { return this.http.get<D.SeguimientoDTO>(this.u(`/collection-requests/${id}/tracking`)); }

  // --- Chat
  messages(id: number): Observable<D.MensajeDTO[]> { return this.http.get<D.MensajeDTO[]>(this.u(`/collection-requests/${id}/messages`)); }
  sendMessage(id: number, contenido: string): Observable<D.MensajeDTO> { return this.http.post<D.MensajeDTO>(this.u(`/collection-requests/${id}/messages`), { contenido }); }

  // --- Notificaciones
  notifications(): Observable<D.NotificacionDTO[]> { return this.http.get<D.NotificacionDTO[]>(this.u('/notifications')); }
  readNotification(id: number): Observable<unknown> { return this.http.patch(this.u(`/notifications/${id}/read`), {}); }
  readAllNotifications(): Observable<unknown> { return this.http.patch(this.u('/notifications/read-all'), {}); }

  // --- Soporte
  faqs(): Observable<D.FaqDTO[]> { return this.http.get<D.FaqDTO[]>(this.u('/faqs')); }
  tickets(): Observable<D.TicketSoporteDTO[]> { return this.http.get<D.TicketSoporteDTO[]>(this.u('/support-tickets')); }
  createTicket(body: D.CrearTicketDTO): Observable<D.TicketSoporteDTO> { return this.http.post<D.TicketSoporteDTO>(this.u('/support-tickets'), body); }

  uploadEvidence(id: number, file: File): Observable<unknown> {
    const f = new FormData(); f.append('archivo', file);
    return this.http.post(this.u(`/support-tickets/${id}/evidence`), f);
  }
  publication(id: number): Observable<D.PublicacionDTO> { return this.http.get<D.PublicacionDTO>(this.u(`/publications/${id}`)); }

  // --- Reportes del mes (END-41, END-42)
  summary(desde: string, hasta: string): Observable<D.ResumenReporteDTO> { return this.http.get<D.ResumenReporteDTO>(this.u('/reports/summary'), { params: { desde, hasta } }); }
  materialsReport(desde: string, hasta: string): Observable<D.ReporteMaterialDTO[]> { return this.http.get<D.ReporteMaterialDTO[]>(this.u('/reports/materials'), { params: { desde, hasta } }); }

  // --- Historial y reportes
  history(): Observable<D.HistorialDTO[]> { return this.http.get<D.HistorialDTO[]>(this.u('/history')); }
  exportHistory(formato: 'csv' | 'pdf'): Observable<Blob> { return this.http.get(this.u('/reports/export'), { params: { formato }, responseType: 'blob' }); }
}
