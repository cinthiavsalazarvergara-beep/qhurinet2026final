import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Delivery } from '../../model/delivery';
import { Contraparte, Thread } from '../../model/chat';
import { Mensaje } from '../../model/mensaje';
import { LoginService } from '../../services/login-service';
import { SolicitudService } from '../../services/solicitud-service';
import { PublicacionService } from '../../services/publicacion-service';
import { MensajeService } from '../../services/mensaje-service';
import { PerfilService } from '../../services/perfil-service';
import { NotificacionService } from '../../services/notificacion-service';
import { RutaService } from '../../services/ruta-service';
import { canScan } from '../../core/entregas';
import { initials, timeOf } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';
import { ListaChatsComponent } from '../lista-chats-component/lista-chats-component';
import { PanelEntregaComponent } from '../panel-entrega-component/panel-entrega-component';
import { EscanerDialogComponent } from '../escaner-dialog-component/escaner-dialog-component';
import { SeguimientoDialogComponent } from '../seguimiento-dialog-component/seguimiento-dialog-component';
import { ValorarDialogComponent } from '../valorar-dialog-component/valorar-dialog-component';

/** Pantalla Chats (ambos roles): hilos, conversación y panel de la entrega. */
@Component({
  selector: 'app-chats-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, ListaChatsComponent, PanelEntregaComponent, EscanerDialogComponent, SeguimientoDialogComponent, ValorarDialogComponent],
  templateUrl: './chats-component.html',
  styleUrl: './chats-component.css',
})
export class ChatsComponent implements OnInit, OnDestroy {
  loginService: LoginService = inject(LoginService);
  solicitudService: SolicitudService = inject(SolicitudService);
  publicacionService: PublicacionService = inject(PublicacionService);
  mensajeService: MensajeService = inject(MensajeService);
  perfilService: PerfilService = inject(PerfilService);
  notificacionService: NotificacionService = inject(NotificacionService);
  rutaService: RutaService = inject(RutaService);
  fb: FormBuilder = inject(FormBuilder);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);

  esGenerador = false;
  entregas: Delivery[] = [];
  hilos: Thread[] = [];
  hiloActivo: Thread | null = null;
  entrega: Delivery | null = null;
  mensajes: Mensaje[] = [];
  contraparte: Contraparte | null = null;
  codigo = '';
  error = '';
  form: FormGroup = this.fb.group({ texto: [''] });

  entregaEscaner: Delivery | null = null;
  entregaSeguimiento: Delivery | null = null;
  entregaConfirmada: Delivery | null = null;

  private suscripcion: Subscription;
  private hiloPedido = '';

  ngOnInit(): void {
    this.esGenerador = this.loginService.getRole() === 'generador';
    const thread = this.route.snapshot.queryParamMap.get('thread');
    if (thread && /^t\d+$/.test(thread)) this.hiloPedido = thread;
    const fuente = this.esGenerador ? this.publicacionService.getListaCambio() : this.solicitudService.getListaCambio();
    this.suscripcion = fuente.subscribe((data) => this.actualizarHilos(data));
    this.recargarEntregas();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  private recargarEntregas(): void {
    if (this.esGenerador) this.publicacionService.actualizarLista();
    else this.solicitudService.actualizarLista();
  }

  /** Hilos del usuario: las entregas que ya tienen una contraparte (solicitud creada). */
  private actualizarHilos(data: Delivery[]): void {
    this.entregas = data;
    this.hilos = data
      .filter((r) => !!r.requestId && !!r.thread)
      .map((r) => ({
        id: r.thread, requestId: r.requestId!, name: r.person, initials: initials(r.person),
        time: '', preview: r.state, tag: (r.kg + ' · ' + r.material).toUpperCase(),
      }));
    const actual = this.hiloPedido || this.hiloActivo?.id || '';
    this.hiloPedido = '';
    const hilo = this.hilos.find((t) => t.id === actual) ?? this.hilos[0] ?? null;
    const cambio = hilo?.id !== this.hiloActivo?.id;
    this.hiloActivo = hilo;
    this.entrega = hilo ? this.entregas.find((r) => r.thread === hilo.id) ?? null : null;
    if (cambio) this.cargarConversacion();
  }

  seleccionar(id: string): void {
    const hilo = this.hilos.find((t) => t.id === id);
    if (!hilo) return;
    this.hiloActivo = hilo;
    this.entrega = this.entregas.find((r) => r.thread === id) ?? null;
    this.entregaSeguimiento = null;
    this.cargarConversacion();
  }

  /** Mensajes del hilo y reputación real de la contraparte. */
  private cargarConversacion(): void {
    const hilo = this.hiloActivo;
    this.codigo = '';
    this.contraparte = null;
    if (!hilo) {
      this.mensajes = [];
      return;
    }
    // La contraparte sale del detalle de la solicitud; su reputación, del endpoint público.
    this.solicitudService.listId(hilo.requestId).subscribe({
      next: (d) => {
        this.perfilService.reputation(this.esGenerador ? d.recolectorId : d.generadorId).subscribe({
          next: (r) => {
            if (this.hiloActivo?.requestId !== hilo.requestId) return;
            this.contraparte = {
              rating: r.calificacionPromedio != null ? Number(r.calificacionPromedio).toFixed(1) : 'Sin valoraciones',
              deliveries: String(r.totalEntregas ?? 0),
              verified: r.verificado ? 'Sí' : 'No',
            };
          },
          error: () => (this.contraparte = null),
        });
      },
      error: () => (this.contraparte = null),
    });
    this.cargarMensajes();
  }

  private cargarMensajes(): void {
    const hilo = this.hiloActivo;
    if (!hilo) return;
    const miId = this.loginService.getUser()?.id;
    this.mensajeService.list(hilo.requestId).subscribe({
      next: (lista) => (this.mensajes = lista.map((m) => ({ id: m.id, mio: m.remitenteId === miId, texto: m.contenido, hora: timeOf(m.fechaEnvio) }))),
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  enviar(): void {
    const texto = String(this.form.value.texto ?? '').trim();
    const hilo = this.hiloActivo;
    if (!texto || !hilo) return;
    this.error = '';
    this.mensajeService.insert(hilo.requestId, texto.slice(0, 500)).subscribe({
      next: () => {
        this.form.reset({ texto: '' });
        this.cargarMensajes();
      },
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  subtitulo(): string {
    return this.entrega ? this.entrega.kg + ' · ' + this.entrega.material : this.hiloActivo?.tag ?? '';
  }

  puedeSeguir(): boolean {
    return this.esGenerador && this.entrega?.state === 'En camino';
  }
  puedeEscanear(): boolean {
    return !this.esGenerador && canScan(this.entrega);
  }
  puedeMostrarCodigo(): boolean {
    return this.esGenerador && ['Reclamado', 'En camino'].includes(this.entrega?.state ?? '');
  }

  /** El generador consulta el código que debe mostrar al reciclador (GET /qr). */
  mostrarCodigo(): void {
    if (!this.entrega?.requestId) return;
    this.solicitudService.qr(this.entrega.requestId).subscribe({
      next: (q) => (this.codigo = q.codigoQr),
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  abrirEscaner(): void {
    if (this.puedeEscanear()) this.entregaEscaner = this.entrega;
  }

  onConfirmado(row: Delivery): void {
    this.entregaEscaner = null;
    this.rutaService.removeStop('a' + row.publicationId);
    this.entregaConfirmada = row;
    this.recargarEntregas();
    this.notificacionService.actualizarLista();
  }

  irSoporte(): void {
    this.router.navigate(['/app', 'soporte']);
  }
}
