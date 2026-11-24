import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Delivery, DeliveryAction, TIME_SLOTS } from '../../model/delivery';
import { SolicitudService } from '../../services/solicitud-service';
import { NotificacionService } from '../../services/notificacion-service';
import { RutaService } from '../../services/ruta-service';
import { canScan, isClosed } from '../../core/entregas';
import { DeliveryTab } from '../../core/mappers';
import { validDate } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';
import { AccionFila, TablaEntregasComponent } from '../tabla-entregas-component/tabla-entregas-component';
import { ResumenMesComponent } from '../resumen-mes-component/resumen-mes-component';
import { AccionDialogComponent } from '../accion-dialog-component/accion-dialog-component';
import { EscanerDialogComponent } from '../escaner-dialog-component/escaner-dialog-component';
import { ValorarDialogComponent } from '../valorar-dialog-component/valorar-dialog-component';

/** Pantalla Recojos del reciclador: tabla de entregas, resumen del mes y sus diálogos. */
@Component({
  selector: 'app-recojos-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TablaEntregasComponent, ResumenMesComponent, AccionDialogComponent, EscanerDialogComponent, ValorarDialogComponent],
  templateUrl: './recojos-component.html',
  styleUrl: './recojos-component.css',
})
export class RecojosComponent implements OnInit, OnDestroy {
  solicitudService: SolicitudService = inject(SolicitudService);
  notificacionService: NotificacionService = inject(NotificacionService);
  rutaService: RutaService = inject(RutaService);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);

  filas: Delivery[] = [];
  pestana: DeliveryTab = 'activos';
  error = '';
  // Diálogos
  dialogo: DeliveryAction | null = null;
  entregaAccion: Delivery | null = null;
  fechaInicial = '';
  franjaInicial = '';
  entregaEscaner: Delivery | null = null;
  entregaConfirmada: Delivery | null = null;

  private suscripcion: Subscription;
  private deepLinkPendiente = true;

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'activos' || tab === 'completados' || tab === 'cancelados') this.pestana = tab;
    this.suscripcion = this.solicitudService.getListaCambio().subscribe((data) => {
      this.filas = data;
      this.abrirDesdeEnlace();
    });
    this.solicitudService.actualizarLista();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  buscar(id: string): Delivery | undefined {
    return this.filas.find((f) => f.id === id);
  }

  onAccion(a: AccionFila): void {
    const row = this.buscar(a.id);
    if (!row) return;
    this.error = '';
    switch (a.tipo) {
      case 'chat':
        if (row.thread) this.router.navigate(['/app', 'chats'], { queryParams: { thread: row.thread } });
        break;
      case 'coordinar':
        if (row.state === 'Creada') this.abrirDialogo('coordinar', row);
        break;
      case 'reprogramar':
      case 'cancelar':
        if (!isClosed(row)) this.abrirDialogo(a.tipo, row);
        break;
      case 'iniciar':
        // El reciclador arranca el recorrido (Coordinada → En camino): habilita QR y seguimiento.
        if (row.state === 'Coordinada' && row.requestId) {
          this.solicitudService.start(row.requestId).subscribe({ next: () => this.recargar(), error: (e) => (this.error = errorMessage(e)) });
        }
        break;
      case 'prioridad':
        if (row.requestId) {
          this.solicitudService.setPriority(row.requestId, !row.priority).subscribe({ next: () => this.recargar(), error: (e) => (this.error = errorMessage(e)) });
        }
        break;
      case 'escanear':
        // El QR solo se habilita una vez coordinada la recolección o en camino.
        if (canScan(row)) this.entregaEscaner = row;
        break;
    }
  }

  abrirDialogo(tipo: DeliveryAction, row: Delivery): void {
    this.dialogo = tipo;
    this.entregaAccion = row;
  }

  cerrarDialogo(): void {
    this.dialogo = null;
    this.entregaAccion = null;
    this.fechaInicial = '';
    this.franjaInicial = '';
  }

  onCompletado(): void {
    this.cerrarDialogo();
    this.recargar();
  }

  onConfirmado(row: Delivery): void {
    this.entregaEscaner = null;
    this.rutaService.removeStop('a' + row.publicationId);
    this.entregaConfirmada = row;
    this.recargar();
  }

  private recargar(): void {
    this.solicitudService.actualizarLista();
    this.notificacionService.actualizarLista();
  }

  /** Deep link ?dialog=reprogramar&row=r2&date=2030-05-05&slot=tarde (solo la primera carga). */
  private abrirDesdeEnlace(): void {
    if (!this.deepLinkPendiente) return;
    this.deepLinkPendiente = false;
    const q = this.route.snapshot.queryParamMap;
    const dialog = q.get('dialog');
    const row = this.buscar(q.get('row') ?? '');
    if (!row) return;
    if (dialog === 'qr') {
      if (canScan(row)) this.entregaEscaner = row;
    } else if (dialog === 'reprogramar' || dialog === 'coordinar' || dialog === 'cancelar') {
      const date = q.get('date') ?? '';
      const slot = q.get('slot') ?? '';
      this.fechaInicial = validDate(date) ? date : '';
      this.franjaInicial = TIME_SLOTS.includes(slot) ? slot : '';
      this.abrirDialogo(dialog, row);
    }
  }
}
