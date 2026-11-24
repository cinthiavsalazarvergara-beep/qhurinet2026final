import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActualizarPerfilDTO, MetodoPagoUsuarioDTO, PerfilUsuarioDTO, ReputacionDTO } from '../model/perfil-usuario';

/** Perfil del usuario de la sesión, disponibilidad, métodos de pago y reputación. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private url = environment.apiUrl + '/users';
  private http: HttpClient = inject(HttpClient);
  private perfilCambio = new Subject<PerfilUsuarioDTO>();

  me(): Observable<PerfilUsuarioDTO> {
    return this.http.get<PerfilUsuarioDTO>(this.url + '/me');
  }
  update(perfil: ActualizarPerfilDTO): Observable<PerfilUsuarioDTO> {
    return this.http.put<PerfilUsuarioDTO>(this.url + '/me', perfil);
  }
  setAvailability(enLinea: boolean): Observable<{ enLinea: boolean }> {
    return this.http.patch<{ enLinea: boolean }>(this.url + '/me/availability', { enLinea });
  }
  /** Reemplaza la lista completa de métodos de pago (exactamente uno predeterminado). */
  savePaymentMethods(metodos: MetodoPagoUsuarioDTO[]): Observable<unknown> {
    return this.http.patch(this.url + '/me/payment-method', { metodos });
  }
  uploadAvatar(file: File): Observable<{ fotoPerfilUrl: string }> {
    const form = new FormData();
    form.append('archivo', file);
    return this.http.post<{ fotoPerfilUrl: string }>(this.url + '/me/avatar', form);
  }
  reputation(userId: number): Observable<ReputacionDTO> {
    return this.http.get<ReputacionDTO>(this.url + '/' + userId + '/reputation');
  }

  setPerfil(perfil: PerfilUsuarioDTO): void {
    this.perfilCambio.next(perfil);
  }
  getPerfilCambio(): Observable<PerfilUsuarioDTO> {
    return this.perfilCambio.asObservable();
  }
  actualizarPerfil(): void {
    this.me().subscribe({
      next: (data) => this.setPerfil(data),
      error: (err) => console.error('Error actualizando perfil', err),
    });
  }
}
