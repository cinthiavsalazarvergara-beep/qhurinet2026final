import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Role, Tab, TAB_ROLE, HEADERS, RECICLADOR_TABS, GENERADOR_TABS, TAB_LABELS } from '../model/account.model';
import { MATERIALS, MAT_ORDER, MAP_MATERIALS } from '../model/material.model';
import { POINT_TYPES, POINT_TYPE_KEYS, PointTypeKey, RecyclingPoint } from '../model/point.model';
import { ROUTE_ORIGIN, RouteLocation, SavedRoute } from '../model/ad.model';
import { Delivery, SLOT_LABELS, TIME_SLOTS, rowRole } from '../model/delivery.model';
import { Message, Thread } from '../model/chat.model';
import { DOC_TYPES, PAY_KINDS, PROFILE_EMPTY, Profile, VerificationDoc, PayMethod } from '../model/profile.model';
import { PAY_OPTIONS, REPORT_CATEGORIES, SUGGEST_RULES, TICKET_CATEGORIES, TICKET_STATES, Ticket, ticketCategoryValue } from '../model/support.model';
import { AppNotification } from '../model/notification.model';
import { ICONS } from '../model/icons';
import { Api } from '../core/api';
import { errorMessage } from '../core/http-error';
import { CategoriaMaterialDTO, HistorialDTO, PerfilUsuarioDTO } from '../core/api.models';
import {
  ACTIVE_STATES, AdView, DeliveryTab, cap, fmtNum, matKey, stateTab, toAd, toLocation, toPickup, toPoint, toPublication, kgLabel,
} from '../core/mappers';
import { AuthService } from './auth.service';

// ---- Utilidades
const normalizeSearch = (t: string): string =>
  String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const todayDate = (): string => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
const shortDate = (iso: string): string => { const d = new Date(iso); return [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/'); };
const timeOf = (iso: string): string => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const validDate = (v: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

type Locs = readonly RouteLocation[];
const locOf = (locs: Locs, id: string): RouteLocation | undefined => locs.find((p) => p.id === id);
const validStops = (locs: Locs, ids: string[]): string[] => [...new Set(ids)].filter((id) => locs.some((p) => p.id === id));
// 1 unidad del dibujo = 80 m, velocidad media 15 km/h y 3 min por parada.
const legDistance = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y) * 0.08;

interface RouteStats { stops: RouteLocation[]; kg: string; distance: number; distanceLabel: string; minutes: number; }
const routeStats = (locs: Locs, ids: string[]): RouteStats => {
  let previous: { x: number; y: number } = ROUTE_ORIGIN;
  let distance = 0;
  let kg = 0;
  const stops = validStops(locs, ids).map((id) => locOf(locs, id)!);
  stops.forEach((p) => { distance += legDistance(previous, p); kg += p.kg; previous = p; });
  return {
    stops, kg: kg.toLocaleString('es-ES') + ' kg', distance,
    distanceLabel: distance.toFixed(1).replace('.', ',') + ' km',
    minutes: Math.ceil((distance / 15) * 60 + stops.length * 3),
  };
};
const optimizeStops = (locs: Locs, ids: string[]): string[] => {
  const remaining = validStops(locs, ids);
  const ordered: string[] = [];
  let previous: { x: number; y: number } = ROUTE_ORIGIN;
  while (remaining.length) {
    remaining.sort((a, b) => legDistance(previous, locOf(locs, a)!) - legDistance(previous, locOf(locs, b)!) || a.localeCompare(b));
    const id = remaining.shift()!;
    ordered.push(id);
    previous = locOf(locs, id)!;
  }
  return routeStats(locs, ordered).distance <= routeStats(locs, ids).distance ? ordered : validStops(locs, ids);
};

// Ciclo de vida del recojo (backend): creada → coordinada → en_camino → ejecutada, con cancelada.
// Reclamar un anuncio deja el recojo «Creada»; coordinar día y franja lo pasa a «Coordinada»;
// iniciar el recorrido lo pone «En camino»; validar el QR del generador lo completa.
const SCANNABLE_STATES = ['Coordinada', 'En camino'] as const;
const STATE_STYLE: Record<string, readonly [string, string]> = {
  Creada: ['#fdf3dd', '#8a6a1f'],
  Coordinada: ['#eceee7', '#5d6b5f'],
  'En camino': ['#eef2e4', '#3f6224'],
  Completado: ['#eef2e4', '#3f6224'],
  Reprogramado: ['#fdf3dd', '#8a6a1f'],
  Cancelado: ['#f7e9e4', '#b1573f'],
  Esperando: ['#fdf3dd', '#8a6a1f'],
  Reclamado: ['#eceee7', '#5d6b5f'],
};

export interface DeliveryRow extends Delivery {
  rowBg: string;
  menuOpen: boolean;
  locked: boolean;
  lockHint: string;
  priorityLabel: string;
  canTrack: boolean;
  canScan: boolean;
  canRate: boolean;
  canCoordinate: boolean;
  canStartRoute: boolean;
}

const DOC_LABELS: Record<string, string> = { dni: 'Documento de identidad', ruc: 'RUC del negocio', otro: 'Otro documento' };

/** Distritos de Lima con coordenadas aproximadas (el backend exige latitud/longitud al publicar). */
export const DISTRICTS: Record<string, { lat: number; lng: number }> = {
  'San Isidro': { lat: -12.0974, lng: -77.0367 }, Miraflores: { lat: -12.1218, lng: -77.0296 },
  Magdalena: { lat: -12.0897, lng: -77.0709 }, 'Jesús María': { lat: -12.0774, lng: -77.0472 },
  Lince: { lat: -12.0841, lng: -77.0361 }, Surquillo: { lat: -12.1135, lng: -77.0186 },
  Barranco: { lat: -12.1456, lng: -77.0204 }, Surco: { lat: -12.1322, lng: -76.9967 },
  'San Borja': { lat: -12.101, lng: -76.993 }, 'Pueblo Libre': { lat: -12.0724, lng: -77.0632 },
  'San Miguel': { lat: -12.0773, lng: -77.0888 },
};

/**
 * Estado de la consola. Los datos de negocio (anuncios, recojos, chats, perfil, notificaciones,
 * soporte) vienen del backend vía `Api`; aquí viven además las señales de interfaz (filtros,
 * diálogos, formularios) y los valores derivados que usan las plantillas.
 * Las acciones llaman a la API y, si salen bien, recargan los datos afectados.
 */
@Injectable({ providedIn: 'root' })
export class ConsoleStore {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(Api);

  // ---- Datos del servidor
  readonly loading = signal(false);
  readonly loadError = signal('');
  /** Último error de una acción (reclamar, cancelar, publicar…). */
  readonly actionError = signal('');
  readonly categories = signal<CategoriaMaterialDTO[]>([]);
  private readonly adsData = signal<AdView[]>([]);
  private readonly pointsData = signal<RecyclingPoint[]>([]);
  private readonly pickupsData = signal<Delivery[]>([]);
  private readonly publicationsData = signal<Delivery[]>([]);
  /** Reputación real de la contraparte del hilo abierto (GET /users/{id}/reputation). */
  readonly counterpart = signal<{ rating: string; deliveries: string; verified: string } | null>(null);
  private readonly messagesData = signal<{ id: number; from: 'me' | 'them'; text: string; time: string }[]>([]);
  private readonly notificationsData = signal<AppNotification[]>([]);
  readonly faqData = signal<{ q: string; a: string }[]>([]);
  private readonly ticketsData = signal<Ticket[]>([]);
  readonly history = signal<ReadonlyArray<{ type: string; material: string; party: string; date: string; rating: string }>>([]);
  private readonly docsData = signal<VerificationDoc[]>([]);
  /** Resumen y desglose por material del mes en curso (GET /reports/summary y /materials). */
  readonly summary = signal<{ kg: string; total: string; rating: string; compliance: string } | null>(null);
  readonly materialsReport = signal<{ label: string; kg: string; pct: number; color: string }[]>([]);

  // ---- Navegación / rol
  readonly role = signal<Role>('reciclador');
  readonly activeTab = signal<Tab>('mapa');
  readonly isGen = computed(() => this.role() === 'generador');

  // ---- Mapa
  readonly mapView = signal<'anuncios' | 'puntos'>('anuncios');
  readonly search = signal('');
  readonly mapMaterial = signal('');
  readonly pointType = signal('');
  readonly hiddenTypes = signal<string[]>([]);
  readonly selectedPoint = signal<string | null>(null);
  readonly filters = signal<Record<string, boolean>>({});

  // ---- Ruta / flujo
  readonly routeIds = signal<string[]>([]);
  readonly optimized = signal(false);
  readonly loadedRoute = signal('');
  readonly savedPanel = signal(false);
  readonly savedRoutesState = signal<SavedRoute[]>([]);
  private nextRouteId = 1;
  readonly routeNotice = signal('');

  // ---- Entregas
  /** Pestaña activa de las tablas de Recojos / Anuncios. */
  readonly deliveryTab = signal<DeliveryTab>('activos');
  readonly menuRow = signal<string | null>(null);
  readonly dialog = signal<'' | 'guardar' | 'reprogramar' | 'coordinar' | 'cancelar' | 'qr'>('');
  readonly actionRow = signal<string | null>(null);
  readonly scheduleDate = signal('');
  readonly scheduleSlot = signal<string>(TIME_SLOTS[0]);
  readonly reason = signal('');
  readonly manualCode = signal('');
  readonly formError = signal('');
  readonly routeName = signal('');
  readonly routeDescription = signal('');

  // ---- Seguimiento / valoración
  readonly tracking = signal<string | null>(null);
  readonly trackingStart = signal(0);
  readonly trackingMinutes = signal<number | null>(null);
  readonly rateOpen = signal(false);
  readonly rating = signal(0);
  readonly ratingComment = signal('');
  readonly confirmedRow = signal<string | null>(null);
  /** Código de entrega que el generador muestra al reciclador (GET /qr). */
  readonly deliveryCode = signal('');

  // ---- Chats
  readonly thread = signal('');
  readonly chatRow = signal<string | null>(null);
  readonly draft = signal('');

  // ---- Publicar
  readonly materials = signal<Record<string, boolean>>({ carton: true });
  readonly qty = signal('');
  readonly pubDate = signal('');
  readonly pubSlot = signal<string>(TIME_SLOTS[0]);
  readonly pubAddress = signal('');
  readonly pubDistrict = signal('San Isidro');
  readonly pubPay = signal<string>('Sin pago');
  readonly pubAmount = signal('');
  readonly note = signal('');
  readonly photo = signal('');
  readonly photoName = signal('');
  readonly pubErrors = signal<Record<string, string>>({});
  readonly publishing = signal(false);
  readonly draftNotice = signal('');
  readonly dismissedSuggestion = signal('');

  // ---- Perfil
  readonly profile = signal<Profile>({ ...PROFILE_EMPTY });
  private readonly profileData = signal<PerfilUsuarioDTO | null>(null);
  readonly editProfile = signal(false);
  readonly profileForm = signal<Profile | null>(null);
  readonly profileErrors = signal<Record<string, string>>({});
  readonly available = signal(true);

  // ---- Documentos
  readonly docsOpen = signal(false);
  readonly docType = signal<string>('DNI');
  readonly docFile = signal<string | null>(null);
  private docFileObj: File | null = null;
  readonly docError = signal('');

  // ---- Pagos
  readonly payOpen = signal(false);
  readonly payKind = signal('yape');
  readonly payDetail = signal('');
  readonly payAsDefault = signal(true);
  readonly payError = signal('');

  // ---- Soporte
  readonly reportCategory = signal<string>(REPORT_CATEGORIES[0]);
  readonly reportText = signal('');
  readonly reportFile = signal('');
  private reportFileObj: File | null = null;
  readonly reportError = signal('');
  readonly reportNotice = signal('');
  readonly faqOpen = signal<Record<number, boolean>>({ 0: true });

  // ---- Notificaciones
  readonly notifOpen = signal(false);

  // =====================================================================
  //  Carga de datos
  // =====================================================================
  /** Carga lo que necesita el rol de la sesión. La llama la consola al entrar. */
  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    if (this.isGen()) this.restoreDraft();
    const fail = (what: string) => catchError((e) => { this.loadError.set(what + ': ' + errorMessage(e)); return of(null); });
    const common = [
      this.api.categories().pipe(map((c) => this.categories.set(c)), fail('Materiales')),
      this.api.me().pipe(map((p) => this.applyProfile(p)), fail('Perfil')),
      this.api.notifications().pipe(map((n) => this.applyNotifications(n)), fail('Notificaciones')),
      this.api.faqs().pipe(map((f) => this.faqData.set(f.map((x) => ({ q: x.pregunta, a: x.respuesta })))), fail('Preguntas frecuentes')),
      this.api.tickets().pipe(map((t) => this.applyTickets(t)), fail('Tickets')),
      this.api.history().pipe(map((h) => this.applyHistory(h)), fail('Historial')),
      this.api.documents().pipe(map((d) => this.applyDocs(d)), fail('Documentos')),
      this.loadReports().pipe(fail('Reportes')),
    ];
    const byRole = this.isGen()
      ? [this.loadPublications()]
      : [
          this.api.points().pipe(map((p) => this.pointsData.set(p.map((x) => toPoint(x)))), fail('Puntos')),
          this.api.publications().pipe(map((a) => this.adsData.set(a.map((x) => toAd(x)))), fail('Anuncios')),
          this.loadPickups(true),
        ];
    forkJoin([...common, ...byRole]).pipe(switchMap(() => (this.isGen() ? of(null) : this.mergeClaimed()))).subscribe(() => {
      // Una parada solo cuenta si su anuncio existe en el mapa (p. ej. no se pudo cargar uno viejo).
      this.routeIds.update((ids) => validStops(this.locations(), ids));
      this.loading.set(false);
    });
  }

  /** Vacía todo el estado del usuario anterior (se llama al cerrar y al abrir sesión). */
  reset(): void {
    this.adsData.set([]); this.pointsData.set([]); this.pickupsData.set([]); this.publicationsData.set([]);
    this.messagesData.set([]); this.counterpart.set(null); this.notificationsData.set([]); this.faqData.set([]); this.ticketsData.set([]);
    this.history.set([]); this.docsData.set([]); this.summary.set(null); this.materialsReport.set([]); this.profile.set({ ...PROFILE_EMPTY }); this.profileData.set(null);
    this.routeIds.set([]); this.savedRoutesState.set([]); this.thread.set(''); this.chatRow.set(null); this.draft.set('');
    this.deliveryTab.set('activos'); this.actionError.set(''); this.loadError.set(''); this.tracking.set(null);
    this.dialog.set(''); this.actionRow.set(null); this.rateOpen.set(false); this.notifOpen.set(false);
    this.search.set(''); this.mapMaterial.set(''); this.filters.set({}); this.selectedPoint.set(null);
    this.available.set(true);
  }

  private loadPickups(seedRoute = false): Observable<unknown> {
    return this.api.requests().pipe(
      map((rows) => {
        this.pickupsData.set(rows.map(toPickup));
        // La ruta de trabajo arranca con los anuncios que el reciclador ya reclamó y siguen abiertos.
        if (seedRoute) {
          this.routeIds.set(this.pickupsData().filter((p) => ACTIVE_STATES.includes(p.state) && p.publicationId).map((p) => 'a' + p.publicationId));
        }
      }),
      catchError((e) => { this.loadError.set('Recojos: ' + errorMessage(e)); return of(null); }),
    );
  }

  /**
   * El listado del mapa solo trae anuncios disponibles. Los que este reciclador ya reclamó se piden
   * por id para que sigan visibles en el mapa («Reclamado») y como paradas de la ruta.
   */
  private mergeClaimed(): Observable<unknown> {
    const have = new Set(this.adsData().map((a) => a.id));
    const missing = this.pickupsData().filter((p) => p.publicationId && !have.has('a' + p.publicationId) && p.state !== 'Cancelado');
    if (!missing.length) return of(null);
    return forkJoin(missing.map((p) => this.api.publication(p.publicationId!).pipe(map((d) => toAd(d)), catchError(() => of(null))))).pipe(
      map((ads) => this.adsData.update((cur) => [...cur, ...ads.filter((a): a is AdView => !!a)])),
    );
  }

  private loadPublications(): Observable<unknown> {
    return this.api.myPublications().pipe(
      switchMap((rows) => {
        // «En camino» solo lo sabe la solicitud: se consulta para las publicaciones reservadas.
        const reserved = rows.filter((r) => r.estado === 'reservado' && r.solicitudId);
        return (reserved.length
          ? forkJoin(reserved.map((r) => this.api.requestDetail(r.solicitudId!).pipe(map((d) => [r.id, d.solicitud.estado] as const), catchError(() => of([r.id, ''] as const)))))
          : of([] as (readonly [number, string])[])
        ).pipe(map((pairs) => {
          const estados = new Map(pairs);
          this.publicationsData.set(rows.map((r) => toPublication(r, estados.get(r.id))));
        }));
      }),
      catchError((e) => { this.loadError.set('Publicaciones: ' + errorMessage(e)); return of(null); }),
    );
  }

  private loadReports(): Observable<unknown> {
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth(), 1);
    const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const num = (n: number | null | undefined, d = 1) => fmtNum(n, d);
    return forkJoin([this.api.summary(iso(desde), iso(now)), this.api.materialsReport(iso(desde), iso(now))]).pipe(
      map(([r, m]) => {
        this.summary.set({
          kg: num(r.kgTotales), total: String(r.totalRecojos ?? 0),
          rating: r.calificacionPromedio != null ? Number(r.calificacionPromedio).toFixed(1) : '—',
          compliance: r.cumplimiento != null ? Math.round(Number(r.cumplimiento)) + '%' : '—',
        });
        const max = Math.max(1, ...m.map((x) => Number(x.kilos)));
        this.materialsReport.set(m.map((x) => ({ label: cap(x.material), kg: num(x.kilos) + ' kg', pct: Math.round((Number(x.kilos) / max) * 100), color: MATERIALS[matKey(x.material)]?.color ?? '#a3d24a' })));
      }),
    );
  }

  private reloadDeliveries(): void {
    (this.isGen() ? this.loadPublications() : this.loadPickups()).subscribe();
    this.api.notifications().subscribe({ next: (n) => this.applyNotifications(n), error: () => undefined });
    this.loadReports().subscribe({ error: () => undefined });
  }

  /** 987654321 → +51 987 654 321 (formato del prototipo). */
  private fmtPhone(t: string | null | undefined): string {
    const d = String(t ?? '').replace(/^\+?51/, '').replace(/\D/g, '');
    return d.length === 9 ? '+51 ' + d.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : String(t ?? '');
  }

  private applyProfile(p: PerfilUsuarioDTO): void {
    this.profileData.set(p);
    this.profile.set({
      name: p.nombreCompleto, email: p.email, phone: this.fmtPhone(p.telefono), bio: p.descripcion ?? '',
      mats: (p.materiales ?? []).map((m) => matKey(m.nombre)), photo: p.fotoPerfilUrl ?? '',
    });
    this.available.set(!!p.enLinea);
  }
  private applyNotifications(list: { id: number; mensaje: string; leida: boolean; fechaCreacion: string }[]): void {
    this.notificationsData.set(list.map((n) => {
      const cut = n.mensaje.search(/[.:]/);
      return {
        id: 'n' + n.id, apiId: n.id, title: cut > 0 && cut < 48 ? n.mensaje.slice(0, cut) : 'Notificación', text: n.mensaje,
        time: (shortDate(n.fechaCreacion) + ' · ' + timeOf(n.fechaCreacion)).toUpperCase(), read: n.leida,
      };
    }));
  }
  private applyTickets(list: { id: number; categoria: string; estado: string; asunto: string; evidenciaUrl: string | null }[]): void {
    this.ticketsData.set(list.map((t) => ({
      id: '#' + t.id, title: t.asunto, category: TICKET_CATEGORIES[t.categoria] ?? t.categoria,
      state: t.estado === 'cerrado' ? 'Cerrado' : 'Abierto', evidence: !!t.evidenciaUrl, evidenceName: t.evidenciaUrl ? 'adjunta' : '',
    })));
  }
  private applyHistory(list: HistorialDTO[]): void {
    this.history.set(list.map((h) => ({
      type: this.isGen() ? 'Publicación' : 'Recojo', material: cap(h.material) + ' · ' + kgLabel(h.cantidad, h.unidadMedida),
      party: h.contraparte ?? '', date: shortDate(h.fecha), rating: h.calificacionRecolector != null ? String(h.calificacionRecolector) : '—',
    })));
  }
  private applyDocs(list: { id: number; tipo: string; estado: string; fechaSubida: string; urlArchivo: string }[]): void {
    this.docsData.set(list.map((d) => ({
      id: 'd' + d.id, type: d.tipo.toUpperCase(), name: DOC_LABELS[d.tipo.toLowerCase()] ?? 'Documento',
      state: d.estado ? d.estado.charAt(0).toUpperCase() + d.estado.slice(1) : 'Pendiente', date: shortDate(d.fechaSubida),
    })));
  }

  /** Ejecuta una acción de la API: si sale bien recarga, si falla deja el mensaje en `actionError`. */
  private act<T>(obs: Observable<T>, onOk: (v: T) => void = () => undefined, onErr?: (e: unknown) => void): void {
    this.actionError.set('');
    obs.subscribe({
      next: (v) => onOk(v),
      error: (e) => { if (onErr) onErr(e); else this.actionError.set(errorMessage(e)); },
    });
  }

  // =====================================================================
  //  Navegación y rol
  // =====================================================================
  /** Sincroniza el rol con la sesión (el rol lo dicta el servidor; no se puede cambiar desde la UI). */
  syncRoleFromSession(): void {
    const role = this.auth.session()?.role;
    if (role) this.role.set(role);
  }

  /** Lo llama el shell en cada cambio de ruta: fija la pestaña y cierra menús/diálogos/paneles abiertos. */
  setActiveTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.menuRow.set(null);
    this.dialog.set('');
    this.actionRow.set(null);
    this.tracking.set(null);
    this.notifOpen.set(false);
    this.editProfile.set(false);
    this.docsOpen.set(false);
    this.payOpen.set(false);
    this.actionError.set('');
    if (tab === 'chats') this.ensureThread();
  }

  private go(tab: Tab): void { this.router.navigate(['/app', tab]); }

  /**
   * Deep links por query string (mapa, filtros y pestaña de la tabla). Solo lee: siembra el estado
   * al abrir. Los datos de negocio ya no se siembran desde la URL: vienen del servidor.
   */
  seedFromQuery(q: { get(name: string): string | null } | null | undefined): void {
    if (!q) return;
    const get = (k: string) => q.get(k);
    const inList = (arr: readonly string[], v: string | null): v is string => !!v && arr.includes(v);
    const view = get('view');
    if (view === 'puntos' || view === 'anuncios') this.mapView.set(view);
    const qstr = get('q');
    if (qstr != null) this.search.set(qstr);
    if (inList(MAP_MATERIALS, get('material'))) this.mapMaterial.set(get('material')!);
    if (inList(POINT_TYPE_KEYS, get('type'))) this.pointType.set(get('type')!);
    const hidden = get('hidden');
    if (hidden != null) this.hiddenTypes.set(hidden.split(',').filter((t) => (POINT_TYPE_KEYS as string[]).includes(t)));
    const filters: Record<string, boolean> = {};
    if (get('near') === '1') filters['Cerca de mí'] = true;
    if (get('heavy') === '1') filters['+20 kg'] = true;
    if (get('today') === '1') filters['Hoy'] = true;
    if (Object.keys(filters).length) this.filters.set(filters);
    if (get('stops') === 'none') this.routeIds.set([]);
    const thread = get('thread');
    if (thread && /^t\d+$/.test(thread)) { this.thread.set(thread); this.loadMessages(); }
    const dialog = get('dialog');
    const row = get('row');
    if (inList(['reprogramar', 'coordinar', 'cancelar', 'qr'], dialog) && row && this.delivery(row)) {
      this.openAction(dialog as 'reprogramar' | 'coordinar' | 'cancelar' | 'qr', row);
      const date = get('date');
      const slot = get('slot');
      if (date && validDate(date)) this.scheduleDate.set(date);
      if (inList(TIME_SLOTS, slot)) this.scheduleSlot.set(slot);
    }
    const tab = get('tab');
    if (tab === 'activos' || tab === 'completados' || tab === 'cancelados') this.deliveryTab.set(tab);
    if (get('panel') === 'rutas') this.savedPanel.set(true);
    if (get('notif') === '1') this.notifOpen.set(true);
    if (get('edit') === 'perfil') this.openEditProfile();
    if (get('docs') === '1') this.docsOpen.set(true);
    if (get('pay') === '1') this.payOpen.set(true);
  }

  goChats(): void { this.go('chats'); }
  goSoporte(): void { this.go('soporte'); }

  logout(): void {
    this.reset();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // =====================================================================
  //  Lectura de archivos (imagen → data URL)
  // =====================================================================
  private readFile(input: HTMLInputElement, cb: (name: string, url: string, file: File) => void): void {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { cb(file.name, '', file); return; }
    const reader = new FileReader();
    reader.onload = () => cb(file.name, String(reader.result), file);
    reader.readAsDataURL(file);
  }

  // =====================================================================
  //  Entregas (recojos del reciclador y publicaciones del generador)
  // =====================================================================
  private rawRow(id: string | null): Delivery | undefined {
    if (!id) return undefined;
    return [...this.pickupsData(), ...this.publicationsData()].find((r) => r.id === id);
  }

  delivery(id: string | null): Delivery | null { return this.rawRow(id) ?? null; }

  private rowView(row: Delivery): DeliveryRow {
    const locked = ['Completado', 'Cancelado'].includes(row.state);
    const style = STATE_STYLE[row.state];
    const isRecojo = rowRole(row.id) === 'reciclador';
    return {
      ...row,
      priority: !!row.priority,
      rowBg: row.priority ? '#fdf3dd' : '#ffffff',
      stateBg: style ? style[0] : row.stateBg,
      stateFg: style ? style[1] : row.stateFg,
      menuOpen: this.menuRow() === row.id,
      locked,
      lockHint: locked ? 'Esta recolección ya está cerrada.' : '',
      priorityLabel: row.priority ? 'Quitar prioridad' : 'Marcar como prioritaria',
      canTrack: !isRecojo && row.state === 'En camino',
      canRate: !isRecojo && row.state === 'Completado' && !!row.requestId,
      canScan: isRecojo && !!row.code && (SCANNABLE_STATES as readonly string[]).includes(row.state),
      canCoordinate: isRecojo && row.state === 'Creada',
      canStartRoute: isRecojo && row.state === 'Coordinada',
    };
  }

  /** Todas las filas (sin filtrar por pestaña). */
  readonly pickups = computed<DeliveryRow[]>(() => { this.menuRow(); return this.pickupsData().map((p) => this.rowView(p)); });
  readonly publications = computed<DeliveryRow[]>(() => { this.menuRow(); return this.publicationsData().map((p) => this.rowView(p)); });

  private count(rows: DeliveryRow[], tab: DeliveryTab): number { return rows.filter((r) => stateTab(r.state) === tab).length; }
  readonly activePickups = computed(() => this.count(this.pickups(), 'activos'));
  readonly completedPickups = computed(() => this.count(this.pickups(), 'completados'));
  readonly canceledPickups = computed(() => this.count(this.pickups(), 'cancelados'));
  readonly activePublications = computed(() => this.count(this.publications(), 'activos'));
  readonly completedPublications = computed(() => this.count(this.publications(), 'completados'));
  readonly canceledPublications = computed(() => this.count(this.publications(), 'cancelados'));

  /** Cambia la pestaña de la tabla (Activos / Completados / Cancelados) y cierra el menú abierto. */
  setDeliveryTab(tab: DeliveryTab): void { this.deliveryTab.set(tab); this.menuRow.set(null); }

  toggleMenu(id: string): void { this.menuRow.update((m) => (m === id ? null : id)); }
  togglePriority(id: string): void {
    const row = this.delivery(id);
    this.menuRow.set(null);
    if (!row?.requestId) return;
    this.act(this.api.setPriority(row.requestId, !row.priority), () => this.reloadDeliveries());
  }
  reschedule(id: string): void { if (!this.isLocked(id)) this.openAction('reprogramar', id); }
  cancel(id: string): void { if (!this.isLocked(id)) this.openAction('cancelar', id); }
  private isLocked(id: string): boolean {
    const row = this.delivery(id);
    return !row || ['Completado', 'Cancelado'].includes(row.state);
  }
  /** Coordina día y franja de un recojo recién creado (Creada → Coordinada). */
  coordinate(id: string): void { if (this.delivery(id)?.state === 'Creada') this.openAction('coordinar', id); }
  /** El reciclador arranca el recorrido (Coordinada → En camino): habilita QR y seguimiento. */
  startRoute(id: string): void {
    const row = this.delivery(id);
    this.menuRow.set(null);
    if (row?.state === 'Coordinada' && row.requestId) this.act(this.api.start(row.requestId), () => this.reloadDeliveries());
  }
  /** El QR solo se habilita una vez coordinada la recolección o en camino. */
  private canScan(id: string): boolean {
    const d = this.delivery(id);
    return !!d && !!d.code && (SCANNABLE_STATES as readonly string[]).includes(d.state);
  }
  openScannerRow(id: string): void { if (this.canScan(id)) this.openAction('qr', id); }

  openChat(id: string): void {
    const row = this.delivery(id);
    if (!row?.thread) return;
    this.thread.set(row.thread);
    this.chatRow.set(id);
    this.tracking.set(null);
    this.loadMessages();
    this.go('chats');
  }

  openAction(dialog: 'guardar' | 'reprogramar' | 'coordinar' | 'cancelar' | 'qr', id: string): void {
    const row = this.delivery(id);
    if (!row) return;
    this.dialog.set(dialog);
    this.actionRow.set(id);
    this.menuRow.set(null);
    this.scheduleDate.set(row.date || '');
    this.scheduleSlot.set(row.slot && (TIME_SLOTS as readonly string[]).includes(row.slot) ? row.slot : TIME_SLOTS[0]);
    this.reason.set('');
    this.manualCode.set('');
    this.formError.set('');
  }
  closeDialog(): void { this.dialog.set(''); this.actionRow.set(null); this.formError.set(''); this.manualCode.set(''); }

  confirmAction(): void {
    const row = this.delivery(this.actionRow());
    if (!row || ['Completado', 'Cancelado'].includes(row.state) || !row.requestId) return;
    const done = () => { this.closeDialog(); this.reloadDeliveries(); };
    const fail = (e: unknown) => this.formError.set(errorMessage(e));
    if (this.dialog() === 'reprogramar' || this.dialog() === 'coordinar') {
      if (!validDate(this.scheduleDate()) || this.scheduleDate() < todayDate()) {
        this.formError.set('Elige una fecha válida desde hoy.');
        return;
      }
      if (!TIME_SLOTS.includes(this.scheduleSlot() as (typeof TIME_SLOTS)[number])) {
        this.formError.set('Elige una franja horaria.');
        return;
      }
      const when = this.scheduleDate() + 'T00:00:00';
      const call: Observable<unknown> = this.dialog() === 'coordinar'
        ? this.api.coordinate(row.requestId, when, this.scheduleSlot())
        : this.api.reschedule(row.requestId, when, this.scheduleSlot());
      this.act(call, done, fail);
    } else if (this.dialog() === 'cancelar') {
      const reason = this.reason().trim();
      if (!reason) { this.formError.set('Indica el motivo de la cancelación.'); return; }
      // El generador cancela su publicación; el reciclador cancela su recolección.
      const call: Observable<unknown> = rowRole(row.id) === 'generador' && row.publicationId
        ? this.api.cancelPublication(row.publicationId, reason.slice(0, 240))
        : this.api.cancelRequest(row.requestId, reason.slice(0, 240));
      this.act(call, () => {
        this.routeIds.update((ids) => ids.filter((stop) => stop !== 'a' + row.publicationId));
        this.optimized.set(false);
        done();
      }, fail);
    }
  }

  /** Valida el código que muestra el generador y confirma la entrega (validate-qr + confirm). */
  confirmDelivery(manual = false): void {
    const row = this.delivery(this.actionRow());
    if (!row || !row.requestId || !(SCANNABLE_STATES as readonly string[]).includes(row.state)) return;
    const code = this.manualCode().trim().toUpperCase();
    if (!code) { this.formError.set('Ingresa el código de entrega que te muestra el generador.'); return; }
    const requestId = row.requestId;
    this.act(
      this.api.validateQr(requestId, code).pipe(switchMap(() => this.api.confirm(requestId))),
      () => {
        this.dialog.set(''); this.actionRow.set(null);
        this.confirmedRow.set(row.id); this.rateOpen.set(true); this.rating.set(0); this.formError.set('');
        this.routeIds.update((ids) => ids.filter((stop) => stop !== 'a' + row.publicationId));
        this.reloadDeliveries();
      },
      (e) => this.formError.set(
        (e as { status?: number })?.status === 409 || (e as { status?: number })?.status === 400
          ? 'El código no corresponde a esta entrega. Revisa el código que muestra el generador.'
          : errorMessage(e)),
    );
  }
  onManualCode(v: string): void { this.manualCode.set(v.toUpperCase()); this.formError.set(''); }
  confirmManual(): void { this.confirmDelivery(true); }
  setRating(n: number): void { this.rating.set(n); }
  closeRate(): void { this.rateOpen.set(false); this.rating.set(0); this.ratingComment.set(''); }
  onRatingComment(v: string): void { this.ratingComment.set(v); }
  /** El generador valora al reciclador de una publicación ya completada. */
  openRate(id: string): void {
    const row = this.delivery(id);
    if (!this.isGen() || row?.state !== 'Completado' || !row.requestId) return;
    this.confirmedRow.set(id); this.rating.set(0); this.ratingComment.set(''); this.actionError.set(''); this.rateOpen.set(true);
  }

  openScanner(): void {
    const chat = this.chatDelivery();
    const id = this.activeTab() === 'chats' && chat ? chat.id
      : routeStats(this.locations(), this.routeIds()).stops.find((p) => p.pickup)?.pickup || '';
    if (id && this.canScan(id)) this.openAction('qr', id);
  }
  closeScanner(): void { this.closeDialog(); }

  /** El generador consulta el código que debe mostrar al reciclador (GET /qr). */
  showDeliveryCode(id: string): void {
    const row = this.delivery(id);
    if (!row?.requestId) return;
    this.act(this.api.qr(row.requestId), (q) => this.deliveryCode.set(q.codigoQr));
  }

  openTracking(id: string): void {
    const row = this.delivery(id);
    this.tracking.set(id); this.trackingStart.set(0); this.menuRow.set(null); this.trackingMinutes.set(null);
    if (row?.requestId) this.act(this.api.tracking(row.requestId), (t) => this.trackingMinutes.set(t.minutosEstimados));
  }
  closeTracking(): void { this.tracking.set(null); }
  track(id: string): void { this.openTracking(id); }

  /** Calificación del reciclador por el generador (POST /rating). */
  submitRating(): void {
    const row = this.delivery(this.confirmedRow());
    if (this.isGen() && row?.requestId && this.rating() > 0) this.act(this.api.rate(row.requestId, this.rating(), this.ratingComment().trim().slice(0, 240)), () => this.closeRate());
    else this.closeRate();
  }

  // =====================================================================
  //  Mapa
  // =====================================================================
  onSearch(v: string): void { this.search.set(v); this.selectedPoint.set(null); }
  setMapView(view: 'anuncios' | 'puntos'): void { this.mapView.set(view); this.selectedPoint.set(null); }
  toggleFilter(label: string): void { this.filters.update((f) => ({ ...f, [label]: !f[label] })); }
  toggleMaterial(k: string): void { this.mapMaterial.update((m) => (m === k ? '' : k)); }
  togglePointType(type: string): void { this.pointType.update((t) => (t === type ? '' : type)); }
  toggleLegend(type: string): void {
    this.hiddenTypes.update((h) => (h.includes(type) ? h.filter((t) => t !== type) : [...h, type]));
    this.selectedPoint.set(null);
  }
  clearMapFilters(): void {
    this.search.set(''); this.mapMaterial.set(''); this.pointType.set('');
    this.hiddenTypes.set([]); this.filters.set({}); this.selectedPoint.set(null);
  }
  openPoint(id: string): void { this.selectedPoint.set(id); }
  closePoint(): void { this.selectedPoint.set(null); }

  /** Anuncios del mapa ya reclamados por este reciclador (con recojo vigente o cerrado). */
  readonly claimed = computed<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    for (const p of this.pickupsData()) if (p.publicationId && p.state !== 'Cancelado') out['a' + p.publicationId] = true;
    return out;
  });

  /** Reclama un anuncio (POST /collection-requests): crea el recojo y lo agrega a la ruta. */
  claim(id: string): void {
    if (this.claimed()[id]) return;
    const ad = this.adsData().find((a) => a.id === id);
    if (!ad) return;
    this.act(this.api.claim(ad.publicationId), () => {
      this.routeIds.update((ids) => validStops(this.locations(), [...ids, id]));
      this.optimized.set(false);
      // Recarga recojos (para que aparezca en Recojos) y los anuncios (ya no está disponible).
      this.loadPickups().pipe(switchMap(() => this.api.publications()), switchMap((a) => { this.adsData.set(a.map((x) => toAd(x))); return this.mergeClaimed(); })).subscribe();
    });
  }
  addToRoute(id: string): void {
    this.routeIds.update((ids) => validStops(this.locations(), [...ids, id]));
    this.optimized.set(false);
    this.loadedRoute.set('');
  }
  removeStop(id: string): void {
    this.routeIds.update((ids) => ids.filter((s) => s !== id));
    this.optimized.set(false);
    this.loadedRoute.set('');
  }
  openStop(id: string): void {
    if (id.startsWith('p')) {
      this.openPoint(id);
    } else {
      const loc = locOf(this.locations(), id);
      this.setMapView('anuncios');
      this.search.set(loc ? loc.name : '');
      this.mapMaterial.set('');
      this.filters.set({});
    }
  }
  showAd(id: string): void {
    const ad = this.adsData().find((a) => a.id === id);
    this.mapView.set('anuncios');
    this.search.set(ad ? ad.place.split(' · ')[0] : '');
    this.mapMaterial.set('');
    this.selectedPoint.set(null);
    this.filters.set({});
  }
  optimizeRoute(): void {
    const had = this.routeIds().length;
    this.routeIds.update((ids) => optimizeStops(this.locations(), ids));
    this.optimized.set(true);
    this.routeNotice.set(had ? 'Ruta optimizada por cercanía.' : 'Agrega paradas para optimizar la ruta.');
  }
  openSave(): void {
    this.dialog.set('guardar'); this.routeName.set(''); this.routeDescription.set('');
    this.formError.set(''); this.actionRow.set(null);
  }
  saveRoute(): void {
    const name = this.routeName().trim();
    if (!name) { this.formError.set('Ingresa un nombre para la ruta.'); return; }
    if (!this.routeIds().length) { this.formError.set('Agrega al menos una parada antes de guardar.'); return; }
    const id = 'ruta-' + this.nextRouteId++;
    this.savedRoutesState.update((rs) => [...rs, { id, name: name.slice(0, 60), description: this.routeDescription().trim().slice(0, 240), stops: this.routeIds().slice() }]);
    this.loadedRoute.set(id);
    this.savedPanel.set(true);
    this.dialog.set('');
    this.routeNotice.set('Ruta guardada: ' + name);
    this.formError.set('');
  }
  openSaved(): void { this.savedPanel.set(true); this.selectedPoint.set(null); }
  closeSaved(): void { this.savedPanel.set(false); }
  loadSavedRoute(r: SavedRoute): void {
    const ids = r.stops.filter((id) => {
      const p = locOf(this.locations(), id);
      return !p?.pickup || !['Cancelado', 'Completado'].includes(this.delivery(p.pickup)?.state ?? '');
    });
    this.routeIds.set(ids);
    this.loadedRoute.set(r.id);
    this.optimized.set(false);
    this.savedPanel.set(false);
    this.selectedPoint.set(null);
    this.search.set(''); this.mapMaterial.set(''); this.pointType.set(''); this.hiddenTypes.set([]); this.filters.set({});
    this.routeNotice.set('Ruta cargada: ' + r.name);
  }
  removeSavedRoute(r: SavedRoute): void {
    this.savedRoutesState.update((rs) => rs.filter((s) => s.id !== r.id));
    if (this.loadedRoute() === r.id) this.loadedRoute.set('');
    this.routeNotice.set('Ruta eliminada: ' + r.name);
  }
  routeChat(): void {
    const stop = routeStats(this.locations(), this.routeIds()).stops.find((p) => p.pickup);
    if (stop?.pickup) this.openChat(stop.pickup);
  }

  /** Paradas posibles: anuncios (enlazados a su recojo si ya se reclamaron) y puntos fijos. */
  readonly locations = computed<RouteLocation[]>(() => {
    const byPub = new Map(this.pickupsData().filter((p) => p.publicationId).map((p) => ['a' + p.publicationId, p.id] as const));
    return [
      ...this.adsData().map((a) => toLocation(a, byPub.get(a.id) ?? null)),
      ...this.pointsData().map((p) => ({ id: p.id, name: p.name, detail: POINT_TYPES[p.type].label + ' · ' + p.district, x: p.x, y: p.y, kg: 0 })),
    ];
  });
  private readonly featuredId = computed(() => (this.adsData().filter((a) => !this.claimed()[a.id])[0] || {} as { id?: string }).id);
  private readonly stats = computed(() => routeStats(this.locations(), this.routeIds()));
  private acceptsMaterial(mats: string[]): boolean {
    const material = this.mapMaterial();
    return !material || mats.includes(material) || (material === 'plastico' && mats.includes('pet'));
  }

  readonly allAds = computed(() =>
    this.adsData().map((a) => {
      const claimed = !!this.claimed()[a.id];
      const featured = a.id === this.featuredId();
      const mat = MATERIALS[a.mat];
      return {
        ...a,
        stopNumber: this.routeIds().indexOf(a.id) + 1,
        pinLabel: 'Anuncio: ' + a.material + ' · ' + a.place,
        color: mat.color, iconFg: mat.fg, icon: mat.icon,
        cardBorder: claimed ? '#4c7a2f' : featured ? '#16281f' : '#e2e5dc',
        cardShadow: featured ? '0 2px 0 #16281f' : 'none',
        claimed, featured,
        btnLabel: claimed ? 'Reclamado' : 'Reclamar',
        btnBg: claimed ? '#eef2e4' : featured ? '#a3d24a' : '#ffffff',
        btnFg: claimed ? '#3f6224' : '#16281f',
        btnBorder: claimed ? '#eef2e4' : featured ? '#a3d24a' : '#16281f',
      };
    }),
  );

  readonly ads = computed(() => {
    const query = normalizeSearch(this.search());
    const f = this.filters();
    return this.allAds().filter((a) =>
      normalizeSearch(a.place + ' ' + a.material).includes(query) &&
      this.acceptsMaterial([a.mat]) &&
      (!f['Cerca de mí'] || parseFloat(a.dist.replace(',', '.')) <= 5) &&
      (!f['+20 kg'] || parseFloat(a.kg.replace(',', '.')) > 20) &&
      (!f['Hoy'] || a.window.startsWith('HOY')),
    );
  });
  readonly allPoints = computed(() =>
    this.pointsData().map((p) => {
      const inRoute = this.routeIds().includes(p.id);
      return {
        ...p,
        typeLabel: POINT_TYPES[p.type].label, icon: POINT_TYPES[p.type].icon,
        pinLabel: POINT_TYPES[p.type].label + ': ' + p.name,
        distanceLabel: p.distance.toFixed(1).replace('.', ',') + ' KM',
        ratingLabel: p.rating.toFixed(1).replace('.', ','),
        tags: p.materials.map((k) => ({ label: MATERIALS[k].label })),
        cardBorder: this.selectedPoint() === p.id ? '#16281f' : inRoute ? '#4c7a2f' : '#e2e5dc',
        inRoute,
        stopNumber: this.routeIds().indexOf(p.id) + 1,
        routeBg: inRoute ? '#eef2e4' : '#a3d24a',
        routeLabel: inRoute ? 'Agregado a ruta' : 'Agregar a ruta',
        routeHint: inRoute ? 'Este punto ya está incluido como parada en tu ruta activa.' : 'Punto fijo · no requiere reclamar un anuncio.',
      };
    }),
  );
  readonly visiblePoints = computed(() => this.allPoints().filter((p) => !this.hiddenTypes().includes(p.type)));
  readonly points = computed(() => {
    const query = normalizeSearch(this.search());
    const f = this.filters();
    return this.visiblePoints().filter((p) =>
      normalizeSearch(p.name + ' ' + p.address + ' ' + p.district).includes(query) &&
      this.acceptsMaterial(p.materials) &&
      (!this.pointType() || p.type === this.pointType()) &&
      (!f['Cerca de mí'] || p.distance <= 5),
    );
  });
  readonly isPointsView = computed(() => this.mapView() === 'puntos');
  readonly isAdsView = computed(() => this.mapView() === 'anuncios');
  readonly adPins = computed(() => (this.isPointsView() ? this.allAds() : this.ads()));
  readonly pointPins = computed(() => (this.isPointsView() ? this.points() : this.visiblePoints()));
  readonly mapViews = computed(() =>
    (['anuncios', 'puntos'] as const).map((view) => ({
      label: view === 'puntos' ? 'Puntos' : 'Anuncios', view,
      ...this.chip(view === 'puntos' ? 'Puntos' : 'Anuncios', this.mapView() === view),
      active: this.mapView() === view,
    })),
  );
  readonly filterChips = computed(() => {
    const labels = this.isPointsView() ? ['Cerca de mí'] : ['Cerca de mí', '+20 kg', 'Hoy'];
    const base = labels.map((l) => ({ label: l, key: l, ...this.chip(l, !!this.filters()[l]), active: !!this.filters()[l], kind: 'filter' as const }));
    const mats = MAP_MATERIALS.map((k) => ({ label: MATERIALS[k].label, key: k as string, ...this.chip(MATERIALS[k].label, this.mapMaterial() === k), active: this.mapMaterial() === k, kind: 'material' as const }));
    return [...base, ...mats];
  });
  readonly pointTypeChips = computed(() =>
    ['', ...POINT_TYPE_KEYS].map((type) => ({
      type, label: type ? POINT_TYPES[type as PointTypeKey].label : 'Todos',
      ...this.chip(type ? POINT_TYPES[type as PointTypeKey].label : 'Todos', this.pointType() === type),
      active: this.pointType() === type,
    })),
  );
  readonly pointLegend = computed(() =>
    POINT_TYPE_KEYS.map((type) => {
      const active = !this.hiddenTypes().includes(type);
      return { type, label: POINT_TYPES[type].label, active, opacity: active ? '1' : '0.4', decoration: active ? 'none' : 'line-through' };
    }),
  );
  readonly pointDetail = computed(() => this.allPoints().find((p) => p.id === this.selectedPoint()) ?? null);
  readonly mapResultCount = computed(() => (this.isPointsView() ? this.points().length + ' puntos' : this.ads().length + ' anuncios') + ' encontrados');
  readonly mapEmpty = computed(() => (this.isPointsView() ? !this.points().length : !this.ads().length));
  readonly emptyMessage = computed(() => (this.isPointsView() ? 'No encontramos puntos de reciclaje.' : 'No encontramos anuncios.'));

  readonly routeStopsView = computed(() => this.stats().stops.map((p, i) => ({ ...p, number: i + 1 })));
  readonly routeTrace = computed(() => [ROUTE_ORIGIN, ...this.stats().stops].map((p) => p.x + ',' + p.y).join(' '));
  readonly routeKg = computed(() => this.stats().kg.replace('.', ','));
  readonly routeMeta = computed(() => this.stats().stops.length + ' paradas');
  readonly routeDistance = computed(() => this.stats().distanceLabel);
  readonly routeMinutes = computed(() => this.stats().minutes);
  readonly routeCanScan = computed(() => this.stats().stops.some((p) => p.pickup));
  readonly routeEmpty = computed(() => !this.routeStopsView().length);
  readonly savedRoutesView = computed(() =>
    this.savedRoutesState().map((r) => {
      const m = routeStats(this.locations(), r.stops);
      return { ...r, count: m.stops.length, distance: m.distanceLabel, minutes: m.minutes };
    }),
  );

  private chip(label: string, on: boolean, activeBg?: string, activeFg?: string) {
    return {
      bg: on ? activeBg || '#16281f' : '#ffffff',
      fg: on ? activeFg || '#ffffff' : '#3d4a3f',
      border: on ? activeBg || '#16281f' : '#d8dcd2',
    };
  }


  // =====================================================================
  //  Cabecera / navegación lateral
  // =====================================================================
  readonly tabs = computed(() => (this.isGen() ? GENERADOR_TABS : RECICLADOR_TABS));
  readonly navItems = computed(() => {
    const active = this.activeTab();
    return this.tabs().map((k) => ({
      tab: k, label: TAB_LABELS[k], icon: ICONS[k],
      bg: active === k ? '#26402f' : 'transparent',
      color: active === k ? '#a3d24a' : '#8fa392',
    }));
  });
  readonly pageTitle = computed(() => HEADERS[this.activeTab()][0]);
  readonly pageMeta = computed(() => {
    const a = this.activeTab();
    if (a === 'mapa') return this.adsData().length + ' anuncios · ' + this.pointsData().length + ' puntos de reciclaje · Lima';
    if (a === 'recojos') return this.activePickups() + ' activos · ' + this.completedPickups() + ' completados';
    if (a === 'publicaciones') return this.activePublications() + ' activos · ' + this.completedPublications() + ' completados';
    if (a === 'perfil') return (this.isGen() ? 'Generador' : 'Reciclador') + (this.profileData()?.verificado ? ' verificado' : ' sin verificar');
    if (a === 'chats') return this.threads().length + ' conversaciones';
    return HEADERS[a][1];
  });
  readonly statusLabel = computed(() => (this.isGen() ? this.activePublications() + ' ANUNCIOS ACTIVOS' : this.activePickups() + ' RECOJOS ACTIVOS'));
  readonly roleShort = computed(() => (this.isGen() ? 'GEN' : 'REC'));
  readonly avatarInitial = computed(() => this.profile().name.trim()[0]?.toUpperCase() || '?');

  // =====================================================================
  //  Chats (un hilo por solicitud de recolección)
  // =====================================================================
  private readonly initials = (name: string): string => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  /** Hilos del usuario: las entregas que ya tienen una contraparte (solicitud creada). */
  readonly threads = computed<Thread[]>(() =>
    (this.isGen() ? this.publicationsData() : this.pickupsData())
      .filter((r) => !!r.requestId && !!r.thread)
      .map((r) => ({
        id: r.thread, requestId: r.requestId!, name: r.person, initials: this.initials(r.person),
        time: '', preview: r.state, tag: (r.kg + ' · ' + r.material).toUpperCase(),
      })),
  );
  readonly threadsView = computed(() => {
    const active = this.thread();
    return this.threads().map((t) => ({ ...t, bg: active === t.id ? '#f4f5f0' : '#ffffff' }));
  });
  private readonly activeThread = computed<Thread | null>(() => this.threads().find((t) => t.id === this.thread()) ?? this.threads()[0] ?? null);
  readonly chatDelivery = computed<Delivery | null>(() => {
    const t = this.activeThread();
    if (!t) return null;
    return (this.isGen() ? this.publicationsData() : this.pickupsData()).find((r) => r.thread === t.id) ?? null;
  });
  readonly messages = computed(() => {
    const myId = this.auth.session()?.user.id;
    return this.messagesData().map((m) => ({
      text: m.text, time: m.time,
      align: m.from === 'me' ? 'flex-end' : 'flex-start',
      bg: m.from === 'me' ? '#16281f' : '#ffffff',
      fg: m.from === 'me' ? '#ffffff' : '#16281f',
      border: m.from === 'me' ? '#16281f' : '#e2e5dc',
      metaFg: m.from === 'me' ? '#8fa392' : '#8b9186',
      mine: m.from === 'me' && myId !== undefined,
    }));
  });
  /** Nombre, iniciales y subtítulo SIEMPRE de la contraparte real de la entrega abierta. */
  readonly activeName = computed(() => this.activeThread()?.name ?? '');
  readonly activeInitials = computed(() => this.activeThread()?.initials ?? '');
  readonly activeSub = computed(() => { const d = this.chatDelivery(); return d ? d.kg + ' · ' + d.material : this.activeThread()?.tag ?? ''; });
  readonly hasThreads = computed(() => this.threads().length > 0);
  readonly chatCanTrack = computed(() => this.isGen() && this.chatDelivery()?.state === 'En camino');
  readonly chatCanScan = computed(() => {
    const d = this.chatDelivery();
    return !this.isGen() && !!d && !!d.code && (SCANNABLE_STATES as readonly string[]).includes(d.state);
  });
  readonly chatCanShowCode = computed(() => this.isGen() && ['Reclamado', 'En camino'].includes(this.chatDelivery()?.state ?? ''));

  /** Selecciona el primer hilo si no hay uno válido y carga su conversación. */
  private ensureThread(): void {
    if (!this.threads().some((t) => t.id === this.thread()) && this.threads().length) {
      this.thread.set(this.threads()[0].id);
      this.chatRow.set(this.chatDelivery()?.id ?? null);
    }
    this.loadMessages();
  }
  private loadMessages(): void {
    const t = this.activeThread();
    this.deliveryCode.set('');
    this.counterpart.set(null);
    if (!t) { this.messagesData.set([]); return; }
    // La contraparte sale del detalle de la solicitud; su reputación, del endpoint público.
    this.api.requestDetail(t.requestId).pipe(
      switchMap((d) => this.api.reputation(this.isGen() ? d.recolectorId : d.generadorId)),
    ).subscribe({
      next: (r) => { if (this.activeThread()?.requestId === t.requestId) this.counterpart.set({
        rating: r.calificacionPromedio != null ? Number(r.calificacionPromedio).toFixed(1) : 'Sin valoraciones',
        deliveries: String(r.totalEntregas ?? 0), verified: r.verificado ? 'Sí' : 'No' }); },
      error: () => this.counterpart.set(null),
    });
    const myId = this.auth.session()?.user.id;
    this.api.messages(t.requestId).subscribe({
      next: (list) => this.messagesData.set(list.map((m) => ({ id: m.id, from: m.remitenteId === myId ? 'me' : 'them', text: m.contenido, time: timeOf(m.fechaEnvio) }))),
      error: (e) => this.actionError.set(errorMessage(e)),
    });
  }
  selectThread(id: string): void {
    this.thread.set(id);
    this.chatRow.set(this.threads().find((t) => t.id === id) ? this.chatDelivery()?.id ?? null : null);
    this.tracking.set(null);
    this.loadMessages();
  }
  onDraft(v: string): void { this.draft.set(v); }
  send(): void {
    const text = this.draft().trim();
    const t = this.activeThread();
    if (!text || !t) return;
    this.act(this.api.sendMessage(t.requestId, text.slice(0, 500)), () => { this.draft.set(''); this.loadMessages(); });
  }
  chatTrack(): void { const d = this.chatDelivery(); if (d) this.openTracking(d.id); }

  // =====================================================================
  //  Publicar (generador)
  // =====================================================================
  readonly matChips = computed(() =>
    MAT_ORDER.map((k) => ({ key: k, label: MATERIALS[k].label, active: !!this.materials()[k], ...this.chip(MATERIALS[k].label, !!this.materials()[k], '#a3d24a', '#16281f') })),
  );
  private readonly pickedMats = computed(() => MAT_ORDER.filter((k) => this.materials()[k]));
  private readonly previewMat = computed(() => MATERIALS[this.pickedMats()[0]] ?? MATERIALS['carton']);
  readonly payChips = computed(() => PAY_OPTIONS.map((o) => ({ label: o, border: this.pubPay() === o ? '#16281f' : '#d8dcd2', weight: this.pubPay() === o ? '600' : '400' })));
  readonly slotOptions = TIME_SLOTS.map((v) => ({ value: v as string, label: SLOT_LABELS[v] }));
  readonly districtOptions = Object.keys(DISTRICTS);
  readonly suggestion = computed(() => {
    const source = normalizeSearch(this.note() + ' ' + this.photoName());
    if (!source.trim()) return null;
    const origin = this.photoName() ? 'foto' : 'nota';
    const rule = SUGGEST_RULES.find((r) => r.keys.some((k) => source.includes(k)) && !this.materials()[r.mat] && this.dismissedSuggestion() !== r.mat + ':' + origin);
    if (!rule) return null;
    return { key: rule.mat + ':' + origin, mat: rule.mat, label: MATERIALS[rule.mat].label, confidence: rule.confidence + (this.photoName() ? 4 : 0), source: this.photoName() ? 'la foto' : 'la nota' };
  });
  readonly hasSuggestion = computed(() => !!this.suggestion());
  readonly suggestionText = computed(() => { const s = this.suggestion(); return s ? 'Por ' + s.source + ', parece ' + s.label + '.' : ''; });
  readonly suggestionConfidence = computed(() => { const s = this.suggestion(); return s ? 'CONFIANZA ' + s.confidence + '%' : ''; });
  readonly previewKg = computed(() => (this.qty() || '—') + ' kg');
  readonly previewMatLabel = computed(() => (this.pickedMats().length ? this.pickedMats().map((k) => MATERIALS[k].label).join(', ') : 'Selecciona material'));
  readonly previewColor = computed(() => (this.pickedMats().length ? this.previewMat().color : '#eceee7'));
  readonly previewIconFg = computed(() => (this.pickedMats().length ? this.previewMat().fg : '#a8b2a2'));
  readonly previewIcon = computed(() => this.previewMat().icon);
  readonly previewWindow = computed(() => (this.pubDate() ? (this.pubDate().split('-').reverse().join('/') + ' · ' + (SLOT_LABELS[this.pubSlot()] ?? '')).toUpperCase() : 'SIN HORARIO'));
  readonly previewPay = computed(() => this.pubPay().toUpperCase());
  readonly publishHint = computed(() => (this.pickedMats().length ? 'Visible para los recicladores de tu zona' : 'Elige un material'));
  // Límite de la nota: tope blando. Se deja escribir y, si se pasa, el error bloquea Publicar.
  readonly noteLimit = 200;
  readonly errQty = computed(() => this.pubErrors()['qty'] || '');
  readonly errMats = computed(() => this.pubErrors()['mats'] || '');
  readonly errDate = computed(() => this.pubErrors()['date'] || '');
  readonly errAddress = computed(() => this.pubErrors()['address'] || '');
  readonly errAmount = computed(() => this.pubErrors()['amount'] || '');
  readonly noteBorder = computed(() => (this.errNote() || this.noteOver() ? '#b1573f' : '#e2e5dc'));
  readonly errNote = computed(() => this.pubErrors()['note'] || '');
  readonly noteCount = computed(() => this.note().length);
  readonly noteOver = computed(() => this.note().length > this.noteLimit);
  readonly noteCounter = computed(() => this.note().length + '/' + this.noteLimit);
  readonly noteCounterFg = computed(() => (this.noteOver() ? '#b1573f' : '#8b9186'));
  /** El backend modela una publicación = un único material: el chip elegido reemplaza al anterior. */
  toggleMat(k: string): void { this.materials.set(this.materials()[k] ? {} : { [k]: true }); this.pubErrors.update((e) => ({ ...e, mats: '' })); }
  onQty(v: string): void { this.qty.set(v.replace(/[^\d.,]/g, '').slice(0, 8)); this.pubErrors.update((e) => ({ ...e, qty: '' })); }
  setQty(v: string): void { this.qty.set(v); }
  setPubDate(v: string): void { this.pubDate.set(v); this.pubErrors.update((e) => ({ ...e, date: '' })); }
  setPubSlot(v: string): void { this.pubSlot.set(v); }
  setPubAddress(v: string): void { this.pubAddress.set(v.slice(0, 255)); this.pubErrors.update((e) => ({ ...e, address: '' })); }
  setPubDistrict(v: string): void { this.pubDistrict.set(v); }
  setPubAmount(v: string): void { this.pubAmount.set(v.replace(/[^\d.,]/g, '').slice(0, 8)); this.pubErrors.update((e) => ({ ...e, amount: '' })); }
  selectPay(o: string): void { this.pubPay.set(o); this.pubErrors.update((e) => ({ ...e, amount: '' })); }
  // Tope físico amplio (anti-desbordes) para poder superar el límite blando y ver el error.
  onNote(v: string): void { this.note.set(v.slice(0, 2000)); this.pubErrors.update((e) => ({ ...e, note: '' })); }
  onPhoto(input: HTMLInputElement): void { this.readFile(input, (name, url) => { this.photo.set(url); this.photoName.set(name); this.dismissedSuggestion.set(''); }); }
  removePhoto(): void { this.photo.set(''); this.photoName.set(''); }
  applySuggestion(): void {
    const s = this.suggestion();
    if (!s) return;
    this.materials.set({ [s.mat]: true });
    this.pubErrors.update((e) => ({ ...e, mats: '' }));
  }
  dismissSuggestion(): void { const s = this.suggestion(); if (s) this.dismissedSuggestion.set(s.key); }

  /** Valida y publica (POST /publications). */
  publishAd(): void {
    const errors: Record<string, string> = {};
    const qty = parseFloat((this.qty() || '').replace(',', '.'));
    const mat = MAT_ORDER.find((k) => this.materials()[k]);
    const category = this.categories().find((c) => matKey(c.nombre) === mat);
    const paid = this.pubPay() !== 'Sin pago';
    const amount = parseFloat((this.pubAmount() || '').replace(',', '.'));
    if (!this.qty()) errors['qty'] = 'Ingresa la cantidad aproximada en kilos.';
    else if (!(qty > 0)) errors['qty'] = 'La cantidad debe ser mayor que cero.';
    if (!mat) errors['mats'] = 'Elige un tipo de material.';
    else if (!category) errors['mats'] = 'Ese material aún no está disponible en el servidor.';
    if (!validDate(this.pubDate()) || this.pubDate() < todayDate()) errors['date'] = 'Elige una fecha válida desde hoy.';
    if (!this.pubAddress().trim()) errors['address'] = 'Indica la dirección de recojo.';
    if (paid && !(amount > 0)) errors['amount'] = 'Indica el monto del pago.';
    if (this.note().length > this.noteLimit) errors['note'] = 'Error: la observación excede el límite de ' + this.noteLimit + ' caracteres.';
    if (Object.keys(errors).length) { this.pubErrors.set(errors); return; }
    const coords = DISTRICTS[this.pubDistrict()] ?? DISTRICTS['San Isidro'];
    this.publishing.set(true);
    this.act(this.api.createPublication({
      categoriaMaterialId: category!.id, cantidad: qty, unidadMedida: 'kg', descripcion: this.note().trim().slice(0, this.noteLimit),
      direccion: this.pubAddress().trim(), distrito: this.pubDistrict(), latitud: coords.lat, longitud: coords.lng,
      fechaDisponibilidad: this.pubDate(), franjaHoraria: this.pubSlot(),
      montoPago: paid ? amount : null, metodoPago: paid ? this.pubPay().toLowerCase() : null,
    }), () => {
      this.publishing.set(false);
      this.pubErrors.set({}); this.qty.set(''); this.materials.set({ carton: true }); this.pubDate.set(''); this.pubAddress.set('');
      this.pubPay.set('Sin pago'); this.pubAmount.set(''); this.note.set(''); this.photo.set(''); this.photoName.set(''); this.dismissedSuggestion.set('');
      try { localStorage.removeItem(this.draftKey()); } catch { /* sin storage */ }
      this.loadPublications().subscribe();
      this.go('publicaciones');
    }, (e) => { this.publishing.set(false); this.pubErrors.set({ form: errorMessage(e) }); });
  }
  private draftKey(): string { return 'qhurinet.draft.' + (this.auth.session()?.user.id ?? 'x'); }
  /** Guarda el formulario como borrador (solo en este navegador). */
  saveDraft(): void {
    const draft = { m: this.materials(), qty: this.qty(), date: this.pubDate(), slot: this.pubSlot(), address: this.pubAddress(), district: this.pubDistrict(), pay: this.pubPay(), amount: this.pubAmount(), note: this.note() };
    try { localStorage.setItem(this.draftKey(), JSON.stringify(draft)); this.draftNotice.set('Borrador guardado.'); } catch { this.draftNotice.set('No se pudo guardar el borrador.'); }
  }
  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(this.draftKey());
      if (!raw) return;
      const d = JSON.parse(raw);
      this.materials.set(d.m ?? { carton: true }); this.qty.set(d.qty ?? ''); this.pubDate.set(d.date ?? ''); this.pubSlot.set(d.slot ?? TIME_SLOTS[0]);
      this.pubAddress.set(d.address ?? ''); this.pubDistrict.set(d.district ?? 'San Isidro'); this.pubPay.set(d.pay ?? 'Sin pago'); this.pubAmount.set(d.amount ?? ''); this.note.set(d.note ?? '');
    } catch { /* borrador ilegible: se ignora */ }
  }
  readonly errForm = computed(() => this.pubErrors()['form'] || '');

  // =====================================================================
  //  Perfil / documentos / pagos
  // =====================================================================
  readonly profileRoleLine = computed(() => (this.isGen() ? 'Generador' : 'Reciclador') + ' · Lima');
  readonly profileMats = computed(() => this.profile().mats.map((k) => MATERIALS[k]?.label ?? k).join(', ') || 'Sin materiales');
  readonly verifiedLabel = computed(() => (this.profileData()?.verificado ? 'Verificado' : 'Sin verificar'));
  readonly rating5 = computed(() => { const r = this.profileData()?.calificacionPromedio; return r != null ? Number(r).toFixed(1) : '—'; });

  // ---- Disponibilidad / visibilidad (PATCH /users/me/availability)
  readonly visibilityLabel = computed(() => (this.available() ? 'Activa' : 'Oculta'));
  readonly visibilityFg = computed(() => (this.available() ? '#4c7a2f' : '#b1573f'));
  readonly visibilityHint = computed(() =>
    this.available()
      ? (this.isGen() ? 'Tus anuncios aparecen en el mapa de los recicladores.' : 'Apareces como reciclador disponible en el mapa.')
      : (this.isGen() ? 'Tus anuncios quedan ocultos: nadie nuevo puede reclamarlos.' : 'Estás oculto en el mapa: no recibirás anuncios nuevos.'),
  );
  toggleAvailability(): void {
    const next = !this.available();
    this.act(this.api.setAvailability(next), (r) => this.available.set(r?.enLinea ?? next));
  }

  /** Historial como CSV generado en el cliente (la descarga oficial usa GET /reports/export). */
  historyCsv(): string {
    const esc = (c: string) => '"' + String(c).replace(/"/g, '""') + '"';
    const header = ['Tipo', 'Material', 'Contraparte', 'Fecha', 'Valoración'];
    const rows = this.history().map((h) => [h.type, h.material, h.party, h.date, h.rating]);
    return [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  }
  private download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  /** Descarga el historial en CSV o PDF generado por el servidor (END-44). */
  exportHistory(formato: 'csv' | 'pdf'): void {
    this.act(this.api.exportHistory(formato), (blob) => this.download(blob, 'qhurinet-historial.' + formato));
  }
  exportHistoryCsv(): void { this.exportHistory('csv'); }
  exportHistoryPdf(): void { this.exportHistory('pdf'); }

  readonly pfMatChips = computed(() => {
    const pf = this.profileForm();
    return MAT_ORDER.map((k) => ({ key: k, label: MATERIALS[k].label, ...this.chip(MATERIALS[k].label, !!(pf && pf.mats.includes(k)), '#a3d24a', '#16281f') }));
  });
  readonly pfErrName = computed(() => this.profileErrors()['name'] || '');
  readonly pfErrPhone = computed(() => this.profileErrors()['phone'] || '');
  readonly pfErrMats = computed(() => this.profileErrors()['mats'] || '');
  readonly pfErrForm = computed(() => this.profileErrors()['form'] || '');
  private avatarFile: File | null = null;
  openEditProfile(): void {
    this.profileForm.set({ ...this.profile(), mats: this.profile().mats.slice() });
    this.profileErrors.set({});
    this.avatarFile = null;
    this.editProfile.set(true);
  }
  closeEdit(): void { this.editProfile.set(false); this.profileForm.set(null); this.profileErrors.set({}); }
  onPfField(key: 'name' | 'phone' | 'bio', v: string): void {
    const max = key === 'bio' ? 240 : 60;
    this.profileForm.update((f) => (f ? { ...f, [key]: v.slice(0, max) } : f));
    this.profileErrors.update((e) => ({ ...e, [key]: '' }));
  }
  togglePfMat(k: string): void {
    this.profileForm.update((f) => (f ? { ...f, mats: f.mats.includes(k) ? f.mats.filter((m) => m !== k) : [...f.mats, k] } : f));
  }
  onPfPhoto(input: HTMLInputElement): void { this.readFile(input, (_n, url, file) => { if (url) { this.avatarFile = file; this.profileForm.update((f) => (f ? { ...f, photo: url } : f)); } }); }
  removePfPhoto(): void { this.avatarFile = null; this.profileForm.update((f) => (f ? { ...f, photo: '' } : f)); }
  saveProfile(): void {
    const f = this.profileForm();
    if (!f) return;
    const errors: Record<string, string> = {};
    if (!f.name.trim()) errors['name'] = 'El nombre no puede quedar vacío.';
    if (!/^\d{9}$/.test(f.phone.replace(/^\+?51/, '').replace(/\D/g, ''))) errors['phone'] = 'Ingresa un teléfono de 9 dígitos.';
    if (!f.mats.length && !this.isGen()) errors['mats'] = 'Elige al menos un material.';
    if (Object.keys(errors).length) { this.profileErrors.set(errors); return; }
    const ids = f.mats.map((k) => this.categories().find((c) => matKey(c.nombre) === k)?.id).filter((x): x is number => x !== undefined);
    this.act(
      this.api.updateMe({ nombreCompleto: f.name.trim(), telefono: f.phone.replace(/\s/g, ''), descripcion: f.bio.trim(), materialesIds: ids }).pipe(
        switchMap((p) => (this.avatarFile ? this.api.uploadAvatar(this.avatarFile).pipe(map((a) => ({ ...p, fotoPerfilUrl: a.fotoPerfilUrl }))) : of(p))),
      ),
      (p) => { this.applyProfile(p); this.closeEdit(); },
      (e) => this.profileErrors.set({ form: errorMessage(e) }),
    );
  }

  readonly documentsView = computed(() =>
    this.docsData().map((d) => ({
      ...d, dot: d.state === 'Aprobado' ? '#4c7a2f' : '#e8b53a', stateFg: d.state === 'Aprobado' ? '#4c7a2f' : '#8a6a1f', stateLabel: d.state.toUpperCase(), fresh: false,
    })),
  );
  readonly approvedCount = computed(() => this.docsData().filter((d) => d.state === 'Aprobado').length);
  readonly docTypeChips = computed(() => DOC_TYPES.map((t) => ({ label: t, ...this.chip(t, this.docType() === t) })));
  openDocs(): void { this.docsOpen.set(true); this.docError.set(''); this.docFile.set(null); this.docFileObj = null; }
  closeDocs(): void { this.docsOpen.set(false); this.docError.set(''); }
  selectDocType(t: string): void { this.docType.set(t); }
  onDocFile(input: HTMLInputElement): void { this.readFile(input, (name, _u, file) => { this.docFile.set(name); this.docFileObj = file; this.docError.set(''); }); }
  uploadDoc(): void {
    const file = this.docFileObj;
    if (!file) { this.docError.set('Selecciona un archivo (PDF o imagen) antes de subirlo.'); return; }
    this.act(this.api.uploadDocument(this.docType().toLowerCase(), file), () => {
      this.docFile.set(null); this.docFileObj = null; this.docError.set(''); this.docType.set('DNI');
      this.api.documents().subscribe((d) => this.applyDocs(d));
    }, (e) => this.docError.set(errorMessage(e)));
  }

  private readonly methodsData = computed(() => this.profileData()?.metodosPago ?? []);
  readonly payments = computed(() =>
    this.methodsData().map((m) => {
      const kind = PAY_KINDS[m.tipo] ?? PAY_KINDS['efectivo'];
      const dato = m.dato ?? '';
      const detail = m.tipo === 'tarjeta' ? '•••• ' + dato : ['yape', 'plin'].includes(m.tipo) ? dato.replace(/^(\d{3})\d{3}(\d{3})$/, '$1 ••• $2')
        : m.tipo === 'transferencia' ? '•••• ' + dato.slice(-4) : 'Pago en mano al entregar';
      return { id: 'm' + m.id, label: kind.short, bg: kind.bg, fg: kind.fg, detail, isDefault: !!m.predeterminado, canUse: !m.predeterminado };
    }),
  );
  readonly payKindChips = computed(() => Object.keys(PAY_KINDS).map((k) => ({ key: k, label: PAY_KINDS[k].label, ...this.chip(PAY_KINDS[k].label, this.payKind() === k) })));
  readonly payHasField = computed(() => !!PAY_KINDS[this.payKind()].field);
  readonly payFieldLabel = computed(() => PAY_KINDS[this.payKind()].field);
  readonly payPlaceholder = computed(() => PAY_KINDS[this.payKind()].placeholder);
  readonly payCheckBg = computed(() => (this.payAsDefault() ? '#16281f' : '#ffffff'));
  readonly payCheckMark = computed(() => (this.payAsDefault() ? '✓' : ''));
  private savePayments(list: { id?: number | null; tipo: string; dato: string | null; predeterminado: boolean }[], done: () => void, fail?: (e: unknown) => void): void {
    this.act(this.api.savePaymentMethods(list).pipe(switchMap(() => this.api.me())), (p) => { this.applyProfile(p); done(); }, fail);
  }
  usePayMethod(id: string): void {
    this.savePayments(this.methodsData().map((m) => ({ id: m.id, tipo: m.tipo, dato: m.dato, predeterminado: 'm' + m.id === id })), () => undefined);
  }
  openPay(): void { this.payOpen.set(true); this.payError.set(''); this.payDetail.set(''); this.payKind.set('yape'); this.payAsDefault.set(true); }
  closePay(): void { this.payOpen.set(false); this.payError.set(''); }
  selectPayKind(k: string): void { this.payKind.set(k); this.payError.set(''); this.payDetail.set(''); }
  onPayDetail(v: string): void { this.payDetail.set(v); this.payError.set(''); }
  togglePayDefault(): void { this.payAsDefault.update((v) => !v); }
  savePayMethod(): void {
    const kind = PAY_KINDS[this.payKind()];
    const raw = this.payDetail().trim();
    const digits = raw.replace(/^\+?51/, '').replace(/\D/g, '');
    if (kind.field && !raw) { this.payError.set('Completa el campo ' + kind.field.toLowerCase() + '.'); return; }
    if (this.payKind() === 'tarjeta' && !/^\d{4}$/.test(raw)) { this.payError.set('Ingresa los últimos 4 dígitos de la tarjeta.'); return; }
    if (['yape', 'plin'].includes(this.payKind()) && !/^\d{9}$/.test(digits)) { this.payError.set('Ingresa un celular de 9 dígitos.'); return; }
    if (this.payKind() === 'transferencia' && !/^\d{20}$/.test(raw.replace(/\D/g, ''))) { this.payError.set('El CCI debe tener 20 dígitos.'); return; }
    const dato = this.payKind() === 'efectivo' ? null : ['yape', 'plin'].includes(this.payKind()) ? digits : this.payKind() === 'transferencia' ? raw.replace(/\D/g, '') : raw;
    const current = this.methodsData().filter((m) => m.tipo !== this.payKind());
    const makeDefault = this.payAsDefault() || current.length === 0;
    const list = [
      ...current.map((m) => ({ id: m.id, tipo: m.tipo, dato: m.dato, predeterminado: makeDefault ? false : !!m.predeterminado })),
      { id: null, tipo: this.payKind(), dato, predeterminado: makeDefault },
    ];
    this.savePayments(list, () => { this.payOpen.set(false); this.payDetail.set(''); this.payError.set(''); this.payKind.set('yape'); this.payAsDefault.set(true); }, (e) => this.payError.set(errorMessage(e)));
  }

  // =====================================================================
  //  Soporte
  // =====================================================================
  readonly faqs = computed(() => this.faqData().map((f, i) => ({ q: f.q, a: f.a, open: !!this.faqOpen()[i], sign: this.faqOpen()[i] ? '−' : '+', index: i })));
  readonly reportChips = computed(() => REPORT_CATEGORIES.map((c) => ({ label: c, border: this.reportCategory() === c ? '#16281f' : '#d8dcd2', weight: this.reportCategory() === c ? '600' : '400' })));
  readonly ticketsView = computed(() =>
    this.ticketsData().map((t) => ({
      id: t.id, title: t.title, state: t.state, bg: (TICKET_STATES[t.state] ?? TICKET_STATES['Abierto'])[0], fg: (TICKET_STATES[t.state] ?? TICKET_STATES['Abierto'])[1],
      meta: t.category + (t.evidence ? ' · evidencia: ' + (t.evidenceName || 'adjunta') : ''),
    })),
  );
  toggleFaq(i: number): void { this.faqOpen.update((f) => ({ ...f, [i]: !f[i] })); }
  selectReportCategory(c: string): void { this.reportCategory.set(c); }
  onReportText(v: string): void { this.reportText.set(v.slice(0, 500)); this.reportError.set(''); }
  onReportFile(input: HTMLInputElement): void { this.readFile(input, (name, _u, file) => { this.reportFile.set(name); this.reportFileObj = file; }); }
  removeReportFile(): void { this.reportFile.set(''); this.reportFileObj = null; }
  sendReport(): void {
    const text = this.reportText().trim();
    if (!text) { this.reportError.set('Cuéntanos qué pasó antes de enviar el reporte.'); return; }
    const file = this.reportFileObj;
    this.act(
      this.api.createTicket({ categoria: ticketCategoryValue(this.reportCategory()), asunto: text.slice(0, 80), descripcion: text }).pipe(
        switchMap((t) => (file ? this.api.uploadEvidence(t.id, file).pipe(map(() => t), catchError(() => of(t))) : of(t))),
      ),
      (t) => {
        this.reportText.set(''); this.reportFile.set(''); this.reportFileObj = null; this.reportError.set('');
        this.reportNotice.set('Ticket #' + t.id + ' creado. Te responderemos pronto.');
        this.api.tickets().subscribe((l) => this.applyTickets(l));
      },
      (e) => this.reportError.set(errorMessage(e)),
    );
  }

  // =====================================================================
  //  Notificaciones
  // =====================================================================
  readonly notificationsView = computed(() =>
    this.notificationsData().map((n) => {
      const unread = !n.read;
      return { ...n, unread, bg: unread ? '#f7f9f2' : '#ffffff', dot: unread ? '#4c7a2f' : '#d8dcd2', weight: unread ? '600' : '500' };
    }),
  );
  readonly unreadCount = computed(() => this.notificationsView().filter((n) => n.unread).length);
  readonly hasUnread = computed(() => this.unreadCount() > 0);
  readonly allRead = computed(() => this.unreadCount() === 0);
  toggleNotif(): void { this.notifOpen.update((v) => !v); }
  closeNotif(): void { this.notifOpen.set(false); }
  markRead(id: string): void {
    const n = this.notificationsData().find((x) => x.id === id);
    if (!n || n.read) return;
    this.act(this.api.readNotification(n.apiId), () => this.notificationsData.update((l) => l.map((x) => (x.id === id ? { ...x, read: true } : x))));
  }
  markAllRead(): void {
    this.act(this.api.readAllNotifications(), () => this.notificationsData.update((l) => l.map((x) => ({ ...x, read: true }))));
  }

  // =====================================================================
  //  Modales (visibilidad derivada)
  // =====================================================================
  readonly actionDelivery = computed(() => this.delivery(this.actionRow()));
  readonly lockedAction = computed(() => { const d = this.actionDelivery(); return !d || ['Completado', 'Cancelado'].includes(d.state); });
  private readonly validActionRole = computed(() => { const d = this.actionDelivery(); return !!d && rowRole(d.id) === (this.isGen() ? 'generador' : 'reciclador'); });
  readonly actionDialog = computed(() => this.validActionRole() && ['reprogramar', 'coordinar', 'cancelar'].includes(this.dialog()));
  readonly actionTitle = computed(() => {
    const d = this.dialog();
    return d === 'cancelar' ? 'Cancelar recolección' : d === 'coordinar' ? 'Coordinar recolección' : 'Reprogramar recolección';
  });
  readonly isCoordinate = computed(() => this.dialog() === 'coordinar');
  readonly showSchedule = computed(() => this.dialog() === 'reprogramar' || this.dialog() === 'coordinar');
  readonly isCancel = computed(() => this.dialog() === 'cancelar');
  readonly saveDialog = computed(() => this.activeTab() === 'mapa' && this.dialog() === 'guardar');
  readonly scannerOpen = computed(() => {
    const d = this.actionDelivery();
    return !this.isGen() && !!d && this.dialog() === 'qr' && !!d.code && (SCANNABLE_STATES as readonly string[]).includes(d.state);
  });
  readonly scannerTitle = computed(() => { const d = this.actionDelivery(); return d ? (d.place ?? '') + ' · ' + d.kg : ''; });
  readonly trackingVisible = computed(() => { const t = this.delivery(this.tracking()); return this.isGen() && ['publicaciones', 'chats'].includes(this.activeTab()) && !!t && t.state === 'En camino'; });
  readonly tracked = computed(() => this.delivery(this.tracking()));
  readonly collectorIcon = ICONS['perfil'];
  readonly confirmedDelivery = computed(() => this.delivery(this.confirmedRow()));
  readonly confirmedTitle = computed(() => { const d = this.confirmedDelivery(); return d ? d.kg + ' de ' + d.material + ' recuperados' : 'Entrega confirmada'; });
  readonly confirmedPerson = computed(() => this.confirmedDelivery()?.person ?? '');
  readonly stars = computed(() => [1, 2, 3, 4, 5].map((n) => ({ n, bg: this.rating() >= n ? '#a3d24a' : '#ffffff', fg: '#16281f', border: this.rating() >= n ? '#a3d24a' : '#d8dcd2' })));
  readonly timeSlots = TIME_SLOTS;
  readonly slotLabels = SLOT_LABELS;
  readonly today = todayDate();
  onScheduleDate(v: string): void { this.scheduleDate.set(v); }
  onScheduleSlot(v: string): void { this.scheduleSlot.set(v); }
  onReason(v: string): void { this.reason.set(v); }
  onRouteName(v: string): void { this.routeName.set(v); }
  onRouteDescription(v: string): void { this.routeDescription.set(v); }
}
