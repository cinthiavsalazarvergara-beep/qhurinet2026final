import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Delivery, DeliveryAction } from '../../model/delivery';
import { PublicacionService } from '../../services/publicacion-service';
import { SolicitudService } from '../../services/solicitud-service';
import { NotificacionService } from '../../services/notificacion-service';
import { isClosed } from '../../core/entregas';
import { DeliveryTab } from '../../core/mappers';
import { errorMessage } from '../../core/http-error';
import { AccionFila, TablaEntregasComponent } from '../tabla-entregas-component/tabla-entregas-component';
import { ResumenMesComponent } from '../resumen-mes-component/resumen-mes-component';
import { AccionDialogComponent } from '../accion-dialog-component/accion-dialog-component';
import { SeguimientoDialogComponent } from '../seguimiento-dialog-component/seguimiento-dialog-component';
import { ValorarDialogComponent } from '../valorar-dialog-component/valorar-dialog-component';

/** Pantalla Anuncios del generador: tabla de publicaciones, resumen del mes y sus diálogos. */
@Component({
  selector: 'app-publicaciones-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TablaEntregasComponent, ResumenMesComponent, AccionDialogComponent, SeguimientoDialogComponent, ValorarDialogComponent],
  templateUrl: './publicaciones-component.html',
  styleUrl: './publicaciones-component.css',
})
export class PublicacionesComponent implements OnInit, OnDestroy {
  publicacionService: PublicacionService = inject(PublicacionService);
  solicitudService: SolicitudService = inject(SolicitudService);
  notificacionService: NotificacionService = inject(NotificacionService);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);

  filas: Delivery[] = [];
  pestana: DeliveryTab = 'activos';
  error = '';
  dialogo: DeliveryAction | null = null;
  entregaAccion: Delivery | null = null;
  entregaSeguimiento: Delivery | null = null;
  entregaValorar: Delivery | null = null;

  private suscripcion: Subscription;

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'activos' || tab === 'completados' || tab === 'cancelados') this.pestana = tab;
    this.suscripcion = this.publicacionService.getListaCambio().subscribe((data) => (this.filas = data));
    this.publicacionService.actualizarLista();
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
      case 'reprogramar':
      case 'cancelar':
        if (!isClosed(row)) {
          this.dialogo = a.tipo;
          this.entregaAccion = row;
        }
        break;
      case 'prioridad':
        if (row.requestId) {
          this.solicitudService.setPriority(row.requestId, !row.priority).subscribe({ next: () => this.recargar(), error: (e) => (this.error = errorMessage(e)) });
        }
        break;
      case 'seguir':
        if (row.state === 'En camino') this.entregaSeguimiento = row;
        break;
      case 'valorar':
        // El generador valora al reciclador de una publicación ya completada.
        if (row.state === 'Completado' && row.requestId) this.entregaValorar = row;
        break;
    }
  }

  cerrarDialogo(): void {
    this.dialogo = null;
    this.entregaAccion = null;
  }

  onCompletado(): void {
    this.cerrarDialogo();
    this.recargar();
  }

  private recargar(): void {
    this.publicacionService.actualizarLista();
    this.notificacionService.actualizarLista();
  }
}
