import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, map, of, Subscription } from 'rxjs';
import { AdView, AnuncioMapa, ChipFiltro, ParadaRuta, ROUTE_ORIGIN, RouteLocation, RutaGuardadaVista, SavedRoute } from '../../model/ad';
import { POINT_TYPE_KEYS, POINT_TYPES, PointTypeKey, PuntoMapa, RecyclingPoint } from '../../model/point';
import { MAP_MATERIALS, MATERIALS } from '../../model/material';
import { Delivery } from '../../model/delivery';
import { PublicacionDTO } from '../../model/publicacion';
import { MiSolicitudDTO } from '../../model/solicitud';
import { PuntoReciclajeDTO } from '../../model/punto-reciclaje';
import { PublicacionService } from '../../services/publicacion-service';
import { SolicitudService } from '../../services/solicitud-service';
import { PuntoReciclajeService } from '../../services/punto-reciclaje-service';
import { NotificacionService } from '../../services/notificacion-service';
import { BusquedaService } from '../../services/busqueda-service';
import { RutaService } from '../../services/ruta-service';
import { ACTIVE_STATES, toAd, toLocation, toPickup, toPoint } from '../../core/mappers';
import { locOf, optimizeStops, routeStats, RouteStats, validStops } from '../../core/ruta';
import { canScan } from '../../core/entregas';
import { normalizeSearch } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';
import { IconoComponent } from '../icono-component/icono-component';
import { MapaListaComponent } from '../mapa-lista-component/mapa-lista-component';
import { RutaActivaComponent } from '../ruta-activa-component/ruta-activa-component';
import { PuntoDetalleComponent } from '../punto-detalle-component/punto-detalle-component';
import { RutasGuardadasComponent } from '../rutas-guardadas-component/rutas-guardadas-component';
import { GuardarRutaDialogComponent, RutaNueva } from '../guardar-ruta-dialog-component/guardar-ruta-dialog-component';
import { EscanerDialogComponent } from '../escaner-dialog-component/escaner-dialog-component';
import { ValorarDialogComponent } from '../valorar-dialog-component/valorar-dialog-component';

/**
 * Pantalla Mapa del reciclador: lista (anuncios/puntos) con filtros, pines, ruta activa,
 * leyenda, rutas guardadas y detalle de punto. La ruta se calcula en el navegador.
 */
@Component({
  selector: 'app-mapa-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    IconoComponent, MapaListaComponent, RutaActivaComponent, PuntoDetalleComponent,
    RutasGuardadasComponent, GuardarRutaDialogComponent, EscanerDialogComponent, ValorarDialogComponent,
  ],
  templateUrl: './mapa-component.html',
  styleUrl: './mapa-component.css',
})
export class MapaComponent implements OnInit, OnDestroy {
  publicacionService: PublicacionService = inject(PublicacionService);
  solicitudService: SolicitudService = inject(SolicitudService);
  puntoService: PuntoReciclajeService = inject(PuntoReciclajeService);
  notificacionService: NotificacionService = inject(NotificacionService);
  busquedaService: BusquedaService = inject(BusquedaService);
  rutaService: RutaService = inject(RutaService);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);

  // ---- Datos del servidor
  ads: AdView[] = [];
  points: RecyclingPoint[] = [];
  pickups: Delivery[] = [];
  error = '';

  // ---- Filtros
  mapView: 'anuncios' | 'puntos' = 'anuncios';
  search = '';
  mapMaterial = '';
  pointType = '';
  hiddenTypes: string[] = [];
  selectedPoint: string | null = null;
  filters: Record<string, boolean> = {};

  // ---- Ruta
  optimized = false;
  loadedRoute = '';
  routeNotice = '';
  savedPanel = false;
  guardarAbierto = false;

  // ---- Diálogos
  entregaEscaner: Delivery | null = null;
  entregaConfirmada: Delivery | null = null;

  // ---- Vista (se recalcula en refrescar())
  claimed: Record<string, boolean> = {};
  locations: RouteLocation[] = [];
  allAds: AnuncioMapa[] = [];
  anuncios: AnuncioMapa[] = [];
  allPoints: PuntoMapa[] = [];
  puntos: PuntoMapa[] = [];
  adPins: AnuncioMapa[] = [];
  pointPins: PuntoMapa[] = [];
  vistas: ChipFiltro[] = [];
  filtroChips: ChipFiltro[] = [];
  tipoChips: ChipFiltro[] = [];
  leyenda: { type: PointTypeKey; label: string; active: boolean }[] = [];
  puntoDetalle: PuntoMapa | null = null;
  stats: RouteStats = routeStats([], []);
  paradas: ParadaRuta[] = [];
  routeTrace = '';
  rutasGuardadas: RutaGuardadaVista[] = [];
  resultado = '';
  vacio = false;
  mensajeVacio = '';

  private suscripcion: Subscription;
  private sinParadas = false;

  ngOnInit(): void {
    this.search = this.busquedaService.texto;
    this.suscripcion = this.busquedaService.getTextoCambio().subscribe((texto) => {
      this.search = texto;
      this.selectedPoint = null;
      this.refrescar();
    });
    this.leerEnlace();
    this.refrescar();
    this.cargar();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  // =====================================================================
  //  Carga de datos
  // =====================================================================
  cargar(): void {
    forkJoin([
      this.puntoService.list().pipe(catchError(() => of([] as PuntoReciclajeDTO[]))),
      this.publicacionService.list().pipe(catchError(() => of([] as PublicacionDTO[]))),
      this.solicitudService.list().pipe(catchError(() => of([] as MiSolicitudDTO[]))),
    ]).subscribe(([pts, pubs, reqs]) => {
      this.points = pts.map((p) => toPoint(p));
      this.puntoService.setList(this.points);
      this.ads = pubs.map((p) => toAd(p));
      this.pickups = reqs.map(toPickup);
      this.solicitudService.setList(this.pickups);
      // La ruta de trabajo arranca con los anuncios que el reciclador ya reclamó y siguen abiertos.
      if (!this.rutaService.seeded) {
        this.rutaService.stops = this.pickups
          .filter((p) => ACTIVE_STATES.includes(p.state) && p.publicationId)
          .map((p) => 'a' + p.publicationId);
        this.rutaService.seeded = true;
      }
      if (this.sinParadas) {
        this.rutaService.stops = [];
        this.sinParadas = false;
      }
      this.agregarReclamados(() => {
        // Una parada solo cuenta si su anuncio o punto existe en el mapa.
        this.calcularUbicaciones();
        this.rutaService.stops = validStops(this.locations, this.rutaService.stops);
        this.refrescar();
      });
    });
  }

  /** Recarga recojos y anuncios (después de reclamar o de confirmar una entrega). */
  private recargar(): void {
    forkJoin([this.solicitudService.list(), this.publicacionService.list()]).subscribe({
      next: ([reqs, pubs]) => {
        this.pickups = reqs.map(toPickup);
        this.solicitudService.setList(this.pickups);
        this.ads = pubs.map((p) => toAd(p));
        this.agregarReclamados(() => this.refrescar());
      },
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  /**
   * El listado del mapa solo trae anuncios disponibles. Los que este reciclador ya reclamó se
   * piden por id para que sigan visibles («Reclamado») y como paradas de la ruta.
   */
  private agregarReclamados(listo: () => void): void {
    const tengo = new Set(this.ads.map((a) => a.id));
    const faltan = this.pickups.filter((p) => p.publicationId && !tengo.has('a' + p.publicationId) && p.state !== 'Cancelado');
    if (!faltan.length) {
      this.publicacionService.setAnuncios(this.ads);
      listo();
      return;
    }
    forkJoin(faltan.map((p) => this.publicacionService.listId(p.publicationId!).pipe(
      map((d) => toAd(d) as AdView | null),
      catchError(() => of(null)),
    ))).subscribe((lista) => {
      this.ads = [...this.ads, ...lista.filter((a): a is AdView => !!a)];
      this.publicacionService.setAnuncios(this.ads);
      listo();
    });
  }

  /** Deep links del mapa: ?view=puntos&q=...&material=pet&type=acopio&hidden=...&near=1&stops=none&panel=rutas */
  private leerEnlace(): void {
    const q = this.route.snapshot.queryParamMap;
    const view = q.get('view');
    if (view === 'puntos' || view === 'anuncios') this.mapView = view;
    const texto = q.get('q');
    if (texto != null) this.busquedaService.setTexto(texto);
    const material = q.get('material');
    if (material && MAP_MATERIALS.includes(material)) this.mapMaterial = material;
    const type = q.get('type');
    if (type && (POINT_TYPE_KEYS as string[]).includes(type)) this.pointType = type;
    const hidden = q.get('hidden');
    if (hidden != null) this.hiddenTypes = hidden.split(',').filter((t) => (POINT_TYPE_KEYS as string[]).includes(t));
    if (q.get('near') === '1') this.filters['Cerca de mí'] = true;
    if (q.get('heavy') === '1') this.filters['+20 kg'] = true;
    if (q.get('today') === '1') this.filters['Hoy'] = true;
    if (q.get('stops') === 'none') this.sinParadas = true;
    if (q.get('panel') === 'rutas') this.savedPanel = true;
  }

  // =====================================================================
  //  Vista derivada
  // =====================================================================
  private calcularUbicaciones(): void {
    const porPublicacion = new Map(this.pickups.filter((p) => p.publicationId).map((p) => ['a' + p.publicationId, p.id] as [string, string]));
    this.locations = [
      ...this.ads.map((a) => toLocation(a, porPublicacion.get(a.id) ?? null)),
      ...this.points.map((p) => ({ id: p.id, name: p.name, detail: POINT_TYPES[p.type].label + ' · ' + p.district, x: p.x, y: p.y, kg: 0 })),
    ];
  }

  private aceptaMaterial(mats: string[]): boolean {
    const material = this.mapMaterial;
    return !material || mats.includes(material) || (material === 'plastico' && mats.includes('pet'));
  }

  /** Recalcula todo lo que muestra la plantilla a partir de los datos y filtros actuales. */
  refrescar(): void {
    const stops = this.rutaService.stops;
    this.claimed = {};
    for (const p of this.pickups) {
      if (p.publicationId && p.state !== 'Cancelado') this.claimed['a' + p.publicationId] = true;
    }
    this.calcularUbicaciones();
    const query = normalizeSearch(this.search);
    const f = this.filters;
    const esPuntos = this.mapView === 'puntos';

    // Anuncios
    const destacado = this.ads.find((a) => !this.claimed[a.id])?.id;
    this.allAds = this.ads.map((a) => {
      const claimed = !!this.claimed[a.id];
      const mat = MATERIALS[a.mat];
      return {
        ...a,
        stopNumber: stops.indexOf(a.id) + 1,
        pinLabel: 'Anuncio: ' + a.material + ' · ' + a.place,
        color: mat.color,
        iconFg: mat.fg,
        claimed,
        featured: a.id === destacado,
        btnLabel: claimed ? 'Reclamado' : 'Reclamar',
      };
    });
    this.anuncios = this.allAds.filter((a) =>
      normalizeSearch(a.place + ' ' + a.material).includes(query) &&
      this.aceptaMaterial([a.mat]) &&
      (!f['Cerca de mí'] || parseFloat(a.dist.replace(',', '.')) <= 5) &&
      (!f['+20 kg'] || parseFloat(a.kg.replace(',', '.')) > 20) &&
      (!f['Hoy'] || a.window.startsWith('HOY')));

    // Puntos
    this.allPoints = this.points.map((p) => {
      const inRoute = stops.includes(p.id);
      return {
        ...p,
        typeLabel: POINT_TYPES[p.type].label,
        pinLabel: POINT_TYPES[p.type].label + ': ' + p.name,
        distanceLabel: p.distance.toFixed(1).replace('.', ',') + ' KM',
        ratingLabel: p.rating.toFixed(1).replace('.', ','),
        tags: p.materials.map((k) => MATERIALS[k].label),
        inRoute,
        selected: this.selectedPoint === p.id,
        stopNumber: stops.indexOf(p.id) + 1,
        routeLabel: inRoute ? 'Agregado a ruta' : 'Agregar a ruta',
        routeHint: inRoute ? 'Este punto ya está incluido como parada en tu ruta activa.' : 'Punto fijo · no requiere reclamar un anuncio.',
      };
    });
    const visibles = this.allPoints.filter((p) => !this.hiddenTypes.includes(p.type));
    this.puntos = visibles.filter((p) =>
      normalizeSearch(p.name + ' ' + p.address + ' ' + p.district).includes(query) &&
      this.aceptaMaterial(p.materials) &&
      (!this.pointType || p.type === this.pointType) &&
      (!f['Cerca de mí'] || p.distance <= 5));

    this.adPins = esPuntos ? this.allAds : this.anuncios;
    this.pointPins = esPuntos ? this.puntos : visibles;
    this.puntoDetalle = this.allPoints.find((p) => p.id === this.selectedPoint) ?? null;
    this.resultado = (esPuntos ? this.puntos.length + ' puntos' : this.anuncios.length + ' anuncios') + ' encontrados';
    this.vacio = esPuntos ? !this.puntos.length : !this.anuncios.length;
    this.mensajeVacio = esPuntos ? 'No encontramos puntos de reciclaje.' : 'No encontramos anuncios.';

    // Chips
    this.vistas = [
      { label: 'Anuncios', key: 'anuncios', active: !esPuntos, kind: 'view' },
      { label: 'Puntos', key: 'puntos', active: esPuntos, kind: 'view' },
    ];
    const etiquetas = esPuntos ? ['Cerca de mí'] : ['Cerca de mí', '+20 kg', 'Hoy'];
    this.filtroChips = [
      ...etiquetas.map((l): ChipFiltro => ({ label: l, key: l, active: !!f[l], kind: 'filter' })),
      ...MAP_MATERIALS.map((k): ChipFiltro => ({ label: MATERIALS[k].label, key: k, active: this.mapMaterial === k, kind: 'material' })),
    ];
    this.tipoChips = ['', ...POINT_TYPE_KEYS].map((t): ChipFiltro => ({
      label: t ? POINT_TYPES[t as PointTypeKey].label : 'Todos', key: t, active: this.pointType === t, kind: 'type',
    }));
    this.leyenda = POINT_TYPE_KEYS.map((t) => ({ type: t, label: POINT_TYPES[t].label, active: !this.hiddenTypes.includes(t) }));

    // Ruta
    this.stats = routeStats(this.locations, stops);
    this.paradas = this.stats.stops.map((p, i) => ({ ...p, number: i + 1 }));
    this.routeTrace = [ROUTE_ORIGIN, ...this.stats.stops].map((p) => p.x + ',' + p.y).join(' ');
    this.rutasGuardadas = this.rutaService.savedRoutes.map((r) => {
      const m = routeStats(this.locations, r.stops);
      return { ...r, count: m.stops.length, distance: m.distanceLabel, minutes: m.minutes };
    });
  }

  routeKg(): string {
    return this.stats.kg.replace('.', ',');
  }
  routeMeta(): string {
    return this.stats.stops.length + ' paradas';
  }
  routeCanScan(): boolean {
    return this.stats.stops.some((p) => p.pickup);
  }

  // =====================================================================
  //  Filtros
  // =====================================================================
  onChip(chip: ChipFiltro): void {
    if (chip.kind === 'view') {
      this.mapView = chip.key as 'anuncios' | 'puntos';
      this.selectedPoint = null;
    } else if (chip.kind === 'filter') {
      this.filters = { ...this.filters, [chip.key]: !this.filters[chip.key] };
    } else if (chip.kind === 'material') {
      this.mapMaterial = this.mapMaterial === chip.key ? '' : chip.key;
    } else {
      this.pointType = this.pointType === chip.key ? '' : chip.key;
    }
    this.refrescar();
  }

  toggleLegend(type: string): void {
    this.hiddenTypes = this.hiddenTypes.includes(type) ? this.hiddenTypes.filter((t) => t !== type) : [...this.hiddenTypes, type];
    this.selectedPoint = null;
    this.refrescar();
  }

  clearMapFilters(): void {
    this.mapMaterial = '';
    this.pointType = '';
    this.hiddenTypes = [];
    this.filters = {};
    this.selectedPoint = null;
    this.busquedaService.setTexto('');
    this.refrescar();
  }

  openPoint(id: string): void {
    this.selectedPoint = id;
    this.refrescar();
  }

  closePoint(): void {
    this.selectedPoint = null;
    this.refrescar();
  }

  // =====================================================================
  //  Anuncios y ruta
  // =====================================================================
  /** Reclama un anuncio (POST /collection-requests): crea el recojo y lo agrega a la ruta. */
  claim(id: string): void {
    if (this.claimed[id]) return;
    const ad = this.ads.find((a) => a.id === id);
    if (!ad) return;
    this.error = '';
    this.solicitudService.insert(ad.publicationId).subscribe({
      next: () => {
        this.rutaService.stops = validStops(this.locations, [...this.rutaService.stops, id]);
        this.optimized = false;
        this.recargar();
      },
      error: (e) => (this.error = errorMessage(e)),
    });
  }

  addToRoute(id: string): void {
    this.rutaService.stops = validStops(this.locations, [...this.rutaService.stops, id]);
    this.optimized = false;
    this.loadedRoute = '';
    this.refrescar();
  }

  removeStop(id: string): void {
    this.rutaService.removeStop(id);
    this.optimized = false;
    this.loadedRoute = '';
    this.refrescar();
  }

  openStop(id: string): void {
    if (id.startsWith('p')) {
      this.openPoint(id);
      return;
    }
    const loc = locOf(this.locations, id);
    this.mapView = 'anuncios';
    this.mapMaterial = '';
    this.filters = {};
    this.busquedaService.setTexto(loc ? loc.name : '');
  }

  showAd(id: string): void {
    const ad = this.ads.find((a) => a.id === id);
    this.mapView = 'anuncios';
    this.mapMaterial = '';
    this.filters = {};
    this.busquedaService.setTexto(ad ? ad.place.split(' · ')[0] : '');
  }

  optimizeRoute(): void {
    const habia = this.rutaService.stops.length;
    this.rutaService.stops = optimizeStops(this.locations, this.rutaService.stops);
    this.optimized = true;
    this.routeNotice = habia ? 'Ruta optimizada por cercanía.' : 'Agrega paradas para optimizar la ruta.';
    this.refrescar();
  }

  saveRoute(datos: RutaNueva): void {
    const id = this.rutaService.newRouteId();
    this.rutaService.savedRoutes = [...this.rutaService.savedRoutes, { id, name: datos.nombre, description: datos.descripcion, stops: this.rutaService.stops.slice() }];
    this.loadedRoute = id;
    this.savedPanel = true;
    this.guardarAbierto = false;
    this.routeNotice = 'Ruta guardada: ' + datos.nombre;
    this.refrescar();
  }

  openSaved(): void {
    this.savedPanel = true;
    this.selectedPoint = null;
    this.refrescar();
  }

  loadSavedRoute(r: SavedRoute): void {
    this.rutaService.stops = r.stops.filter((id) => {
      const p = locOf(this.locations, id);
      const estado = this.pickups.find((x) => x.id === p?.pickup)?.state ?? '';
      return !p?.pickup || !['Cancelado', 'Completado'].includes(estado);
    });
    this.loadedRoute = r.id;
    this.optimized = false;
    this.savedPanel = false;
    this.selectedPoint = null;
    this.mapMaterial = '';
    this.pointType = '';
    this.hiddenTypes = [];
    this.filters = {};
    this.routeNotice = 'Ruta cargada: ' + r.name;
    this.busquedaService.setTexto('');
  }

  removeSavedRoute(r: SavedRoute): void {
    this.rutaService.savedRoutes = this.rutaService.savedRoutes.filter((s) => s.id !== r.id);
    if (this.loadedRoute === r.id) this.loadedRoute = '';
    this.routeNotice = 'Ruta eliminada: ' + r.name;
    this.refrescar();
  }

  /** Recojo de la primera parada que ya es una recolección. */
  private primerRecojo(): Delivery | undefined {
    const stop = this.stats.stops.find((p) => p.pickup);
    return this.pickups.find((x) => x.id === stop?.pickup);
  }

  routeChat(): void {
    const row = this.primerRecojo();
    if (row?.thread) this.router.navigate(['/app', 'chats'], { queryParams: { thread: row.thread } });
  }

  goChats(): void {
    this.router.navigate(['/app', 'chats']);
  }

  openScanner(): void {
    const row = this.primerRecojo();
    if (row && canScan(row)) this.entregaEscaner = row;
  }

  onConfirmado(row: Delivery): void {
    this.entregaEscaner = null;
    this.rutaService.removeStop('a' + row.publicationId);
    this.entregaConfirmada = row;
    this.recargar();
    this.notificacionService.actualizarLista();
  }
}
