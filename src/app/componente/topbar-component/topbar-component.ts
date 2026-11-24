import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HEADERS, Role, Tab } from '../../model/account';
import { Delivery } from '../../model/delivery';
import { Notificacion } from '../../model/notificacion';
import { LoginService } from '../../services/login-service';
import { NotificacionService } from '../../services/notificacion-service';
import { SolicitudService } from '../../services/solicitud-service';
import { PublicacionService } from '../../services/publicacion-service';
import { PuntoReciclajeService } from '../../services/punto-reciclaje-service';
import { PerfilService } from '../../services/perfil-service';
import { BusquedaService } from '../../services/busqueda-service';
import { stateTab } from '../../core/mappers';
import { errorMessage } from '../../core/http-error';
import { NotificacionesComponent } from '../notificaciones-component/notificaciones-component';

/** Cabecera de la consola: título de la pantalla, buscador, notificaciones y estado del rol. */
@Component({
  selector: 'app-topbar-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NotificacionesComponent],
  templateUrl: './topbar-component.html',
  styleUrl: './topbar-component.css',
})
export class TopbarComponent implements OnInit, OnDestroy {
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);
  loginService: LoginService = inject(LoginService);
  notificacionService: NotificacionService = inject(NotificacionService);
  solicitudService: SolicitudService = inject(SolicitudService);
  publicacionService: PublicacionService = inject(PublicacionService);
  puntoService: PuntoReciclajeService = inject(PuntoReciclajeService);
  perfilService: PerfilService = inject(PerfilService);
  busquedaService: BusquedaService = inject(BusquedaService);

  tab: Tab = 'mapa';
  rol: Role = 'reciclador';
  busqueda = '';
  notificaciones: Notificacion[] = [];
  notifAbierto = false;
  error = '';
  private anuncios = 0;
  private puntos = 0;
  private entregas: Delivery[] = [];
  private verificado = false;
  private suscripciones: Subscription[] = [];

  ngOnInit(): void {
    this.rol = this.loginService.getRole() ?? 'reciclador';
    this.busqueda = this.busquedaService.texto;
    this.leerTab();
    this.suscripciones.push(
      this.router.events.subscribe((e) => { if (e instanceof NavigationEnd) this.leerTab(); }),
      this.busquedaService.getTextoCambio().subscribe((t) => (this.busqueda = t)),
      this.notificacionService.getListaCambio().subscribe((n) => (this.notificaciones = n)),
      this.publicacionService.getAnunciosCambio().subscribe((a) => (this.anuncios = a.length)),
      this.puntoService.getListaCambio().subscribe((p) => (this.puntos = p.length)),
      this.perfilService.getPerfilCambio().subscribe((p) => (this.verificado = !!p.verificado)),
    );
    if (this.esGenerador()) {
      this.suscripciones.push(this.publicacionService.getListaCambio().subscribe((d) => (this.entregas = d)));
      this.publicacionService.actualizarLista();
    } else {
      this.suscripciones.push(this.solicitudService.getListaCambio().subscribe((d) => (this.entregas = d)));
      this.solicitudService.actualizarLista();
    }
    this.notificacionService.actualizarLista();
    this.perfilService.actualizarPerfil();
    if (this.route.snapshot.queryParamMap.get('notif') === '1') this.notifAbierto = true;
  }

  ngOnDestroy(): void {
    this.suscripciones.forEach((s) => s.unsubscribe());
  }

  /** Al cambiar de pantalla se fija la pestaña y se cierra el panel de notificaciones. */
  private leerTab(): void {
    // La pestaña está en `data.tab` de la ruta más profunda del estado actual del router.
    let ruta = this.router.routerState.snapshot.root;
    while (ruta.firstChild) ruta = ruta.firstChild;
    const tab = ruta.data['tab'] as Tab | undefined;
    if (tab) this.tab = tab;
    this.notifAbierto = false;
  }

  esGenerador(): boolean {
    return this.rol === 'generador';
  }

  private contar(estado: 'activos' | 'completados'): number {
    return this.entregas.filter((r) => stateTab(r.state) === estado).length;
  }

  titulo(): string {
    return HEADERS[this.tab][0];
  }

  meta(): string {
    switch (this.tab) {
      case 'mapa':
        return this.anuncios + ' anuncios · ' + this.puntos + ' puntos de reciclaje · Lima';
      case 'recojos':
      case 'publicaciones':
        return this.contar('activos') + ' activos · ' + this.contar('completados') + ' completados';
      case 'perfil':
        return (this.esGenerador() ? 'Generador' : 'Reciclador') + (this.verificado ? ' verificado' : ' sin verificar');
      case 'chats':
        return this.entregas.filter((r) => !!r.requestId && !!r.thread).length + ' conversaciones';
      default:
        return HEADERS[this.tab][1];
    }
  }

  estado(): string {
    return this.esGenerador() ? this.contar('activos') + ' ANUNCIOS ACTIVOS' : this.contar('activos') + ' RECOJOS ACTIVOS';
  }

  sinLeer(): number {
    return this.notificaciones.filter((n) => !n.read).length;
  }

  buscar(event: Event): void {
    this.busquedaService.setTexto((event.target as HTMLInputElement).value);
  }

  marcar(id: string): void {
    const n = this.notificaciones.find((x) => x.id === id);
    if (!n || n.read) return;
    this.notificacionService.read(n.apiId).subscribe({
      next: () => (this.notificaciones = this.notificaciones.map((x) => (x.id === id ? { ...x, read: true } : x))),
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  marcarTodas(): void {
    this.notificacionService.readAll().subscribe({
      next: () => (this.notificaciones = this.notificaciones.map((x) => ({ ...x, read: true }))),
      error: (e) => (this.error = errorMessage(e)),
    });
  }
}
