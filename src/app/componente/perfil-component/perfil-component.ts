import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PerfilUsuarioDTO } from '../../model/perfil-usuario';
import { CategoriaMaterialDTO } from '../../model/categoria-material';
import { PayMethodView, Profile, PROFILE_EMPTY, VerificationDoc } from '../../model/profile';
import { Historial } from '../../model/reporte';
import { MATERIALS } from '../../model/material';
import { LoginService } from '../../services/login-service';
import { PerfilService } from '../../services/perfil-service';
import { DocumentoService } from '../../services/documento-service';
import { ReporteService } from '../../services/reporte-service';
import { CategoriaMaterialService } from '../../services/categoria-material-service';
import { RutaService } from '../../services/ruta-service';
import { cap, kgLabel, toPayMethod, toProfile } from '../../core/mappers';
import { downloadBlob, shortDate } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';
import { MetodosPagoComponent } from '../metodos-pago-component/metodos-pago-component';
import { HistorialComponent } from '../historial-component/historial-component';
import { VerificacionComponent } from '../verificacion-component/verificacion-component';
import { EditarPerfilDialogComponent } from '../editar-perfil-dialog-component/editar-perfil-dialog-component';
import { DocumentosDialogComponent } from '../documentos-dialog-component/documentos-dialog-component';
import { MetodoPagoDialogComponent } from '../metodo-pago-dialog-component/metodo-pago-dialog-component';

/** Pantalla Perfil (ambos roles): identidad, visibilidad, pagos, historial y verificación. */
@Component({
  selector: 'app-perfil-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MetodosPagoComponent, HistorialComponent, VerificacionComponent,
    EditarPerfilDialogComponent, DocumentosDialogComponent, MetodoPagoDialogComponent,
  ],
  templateUrl: './perfil-component.html',
  styleUrl: './perfil-component.css',
})
export class PerfilComponent implements OnInit, OnDestroy {
  loginService: LoginService = inject(LoginService);
  perfilService: PerfilService = inject(PerfilService);
  documentoService: DocumentoService = inject(DocumentoService);
  reporteService: ReporteService = inject(ReporteService);
  categoriaService: CategoriaMaterialService = inject(CategoriaMaterialService);
  rutaService: RutaService = inject(RutaService);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);

  esGenerador = false;
  datos: PerfilUsuarioDTO | null = null;
  perfil: Profile = { ...PROFILE_EMPTY };
  disponible = true;
  metodos: PayMethodView[] = [];
  documentos: VerificationDoc[] = [];
  historial: Historial[] = [];
  categorias: CategoriaMaterialDTO[] = [];
  error = '';

  editarAbierto = false;
  documentosAbierto = false;
  pagoAbierto = false;

  private suscripciones: Subscription[] = [];

  ngOnInit(): void {
    this.esGenerador = this.loginService.getRole() === 'generador';
    this.suscripciones.push(this.perfilService.getPerfilCambio().subscribe((p) => this.aplicarPerfil(p)));
    this.suscripciones.push(this.documentoService.getListaCambio().subscribe((d) => (this.documentos = d)));
    this.perfilService.actualizarPerfil();
    this.documentoService.actualizarLista();
    this.categoriaService.list().subscribe({ next: (c) => (this.categorias = c), error: (e) => console.error('Error cargando categorías', e) });
    this.reporteService.history().subscribe({
      next: (lista) => (this.historial = lista.map((h) => ({
        type: this.esGenerador ? 'Publicación' : 'Recojo',
        material: cap(h.material) + ' · ' + kgLabel(h.cantidad, h.unidadMedida),
        party: h.contraparte ?? '',
        date: shortDate(h.fecha),
        rating: h.calificacionRecolector != null ? String(h.calificacionRecolector) : '—',
      }))),
      error: (e) => console.error('Error cargando historial', e),
    });
    // Deep links: ?edit=perfil, ?docs=1, ?pay=1
    const q = this.route.snapshot.queryParamMap;
    if (q.get('edit') === 'perfil') this.editarAbierto = true;
    if (q.get('docs') === '1') this.documentosAbierto = true;
    if (q.get('pay') === '1') this.pagoAbierto = true;
  }

  ngOnDestroy(): void {
    this.suscripciones.forEach((s) => s.unsubscribe());
  }

  private aplicarPerfil(p: PerfilUsuarioDTO): void {
    this.datos = p;
    this.perfil = toProfile(p);
    this.disponible = !!p.enLinea;
    this.metodos = (p.metodosPago ?? []).map(toPayMethod);
  }

  // ---- Valores mostrados
  inicial(): string {
    return this.perfil.name.trim()[0]?.toUpperCase() || '?';
  }
  lineaRol(): string {
    return (this.esGenerador ? 'Generador' : 'Reciclador') + ' · Lima';
  }
  verificado(): string {
    return this.datos?.verificado ? 'Verificado' : 'Sin verificar';
  }
  materiales(): string {
    return this.perfil.mats.map((k) => MATERIALS[k]?.label ?? k).join(', ') || 'Sin materiales';
  }
  rating(): string {
    const r = this.datos?.calificacionPromedio;
    return r != null ? Number(r).toFixed(1) : '—';
  }
  visibilidad(): string {
    return this.disponible ? 'Activa' : 'Oculta';
  }
  pistaVisibilidad(): string {
    if (this.disponible) {
      return this.esGenerador ? 'Tus anuncios aparecen en el mapa de los recicladores.' : 'Apareces como reciclador disponible en el mapa.';
    }
    return this.esGenerador ? 'Tus anuncios quedan ocultos: nadie nuevo puede reclamarlos.' : 'Estás oculto en el mapa: no recibirás anuncios nuevos.';
  }

  // ---- Acciones
  /** Disponibilidad / visibilidad (PATCH /users/me/availability). */
  toggleDisponible(): void {
    const siguiente = !this.disponible;
    this.perfilService.setAvailability(siguiente).subscribe({
      next: (r) => (this.disponible = r?.enLinea ?? siguiente),
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  usarMetodo(id: string): void {
    const lista = (this.datos?.metodosPago ?? []).map((m) => ({ id: m.id, tipo: m.tipo, dato: m.dato, predeterminado: 'm' + m.id === id }));
    this.perfilService.savePaymentMethods(lista).subscribe({
      next: () => this.perfilService.actualizarPerfil(),
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  /** Descarga el historial en CSV o PDF generado por el servidor (END-44). */
  exportar(formato: 'csv' | 'pdf'): void {
    this.reporteService.exportHistory(formato).subscribe({
      next: (blob) => downloadBlob(blob, 'qhurinet-historial.' + formato),
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  onPerfilGuardado(p: PerfilUsuarioDTO): void {
    this.editarAbierto = false;
    this.pagoAbierto = false;
    this.perfilService.setPerfil(p);
  }

  logout(): void {
    this.loginService.logout();
    this.rutaService.reset();
    this.router.navigate(['/login']);
  }
}
