import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { Api } from '../core/api';
import { FakeApi } from '../testing/fake-api';
import { ConsoleStore } from './console-store';

// Comportamiento de la consola contra un backend EN MEMORIA (FakeApi), que replica las reglas del
// servidor. Cubre reclamar, ruta, coordinar/reprogramar/cancelar, QR, publicar, chat, perfil,
// notificaciones y los tres defectos corregidos (reclamos en Recojos, pestañas, datos por rol).
describe('ConsoleStore', () => {
  let store: ConsoleStore;
  let api: FakeApi;
  let navigate: ReturnType<typeof vi.fn>;

  const setup = (role: 'reciclador' | 'generador' = 'reciclador') => {
    navigate = vi.fn();
    api = new FakeApi();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: Router, useValue: { navigate } }, { provide: Api, useValue: api }],
    });
    store = TestBed.inject(ConsoleStore);
    store.role.set(role);
    store.load();
  };

  beforeEach(() => setup());

  it('arranca con los anuncios ya reclamados (a1, a2) en la ruta de trabajo', () => {
    expect(store.routeIds()).toEqual(['a1', 'a2']);
    expect(store.claimed()).toEqual({ a1: true, a2: true, a103: true, a104: true });
  });

  it('reclamar un anuncio lo marca, lo agrega a la ruta y crea el recojo', () => {
    store.claim('a3');
    expect(store.claimed()['a3']).toBe(true);
    expect(store.routeIds()).toContain('a3');
    expect(store.pickups().some((p) => p.publicationId === 3 && p.state === 'Creada')).toBe(true);
  });

  it('un anuncio que ya no está disponible muestra el error del servidor', () => {
    store.claim('a3');
    api.pubs[3].estado = 'reservado';
    store.claim('a4');
    expect(store.actionError()).toContain('ya no está disponible');
  });

  it('agregar y quitar una parada de punto', () => {
    store.addToRoute('p1');
    expect(store.routeIds()).toContain('p1');
    store.removeStop('p1');
    expect(store.routeIds()).not.toContain('p1');
  });

  it('reprogramar una entrega cambia su ventana', () => {
    store.openAction('reprogramar', 'r2');
    store.onScheduleDate('2030-01-15');
    store.onScheduleSlot('tarde');
    store.confirmAction();
    const row = store.delivery('r2')!;
    expect(row.state).toBe('Coordinada');
    expect(row.window).toBe('15/01 12:00–18:00');
  });

  it('reprogramar con fecha pasada muestra error y no cambia la fila', () => {
    store.openAction('reprogramar', 'r2');
    store.onScheduleDate('2000-01-01');
    store.confirmAction();
    expect(store.formError()).toBe('Elige una fecha válida desde hoy.');
    expect(store.delivery('r2')!.state).toBe('Creada');
  });

  it('cancelar una entrega exige motivo y retira su parada de la ruta', () => {
    store.openAction('cancelar', 'r1');
    store.confirmAction();
    expect(store.formError()).toBe('Indica el motivo de la cancelación.');
    store.onReason('No había nadie en la dirección');
    store.confirmAction();
    expect(store.delivery('r1')!.state).toBe('Cancelado');
    expect(store.routeIds()).not.toContain('a1'); // a1 es la parada del recojo r1
  });

  it('marcar prioridad resalta la fila', () => {
    store.togglePriority('r3');
    expect(store.delivery('r3')!.priority).toBe(true);
  });

  it('el escáner valida el código de entrega contra el servidor', () => {
    store.openAction('qr', 'r1');
    store.onManualCode('qh-r9');
    store.confirmManual();
    expect(store.formError()).toContain('no corresponde');
    store.onManualCode('qh-r1');
    store.confirmManual();
    expect(store.delivery('r1')!.state).toBe('Completado');
    expect(store.rateOpen()).toBe(true);
  });

  it('confirmar sin escribir el código pide ingresarlo', () => {
    store.openAction('qr', 'r1');
    store.confirmManual();
    expect(store.formError()).toContain('Ingresa el código');
    expect(store.delivery('r1')!.state).toBe('Coordinada');
  });

  it('optimizar la ruta marca el estado y deja aviso', () => {
    store.optimizeRoute();
    expect(store.optimized()).toBe(true);
    expect(store.routeNotice()).toContain('optimizada');
  });

  it('filtros del mapa: material y buscador', () => {
    store.toggleMaterial('vidrio');
    expect(store.ads().every((a) => a.mat === 'vidrio')).toBe(true);
    store.toggleMaterial('vidrio');
    store.onSearch('zzz-no-existe');
    expect(store.mapEmpty()).toBe(true);
  });

  it('notificaciones: marcar una y todas', () => {
    const before = store.unreadCount();
    expect(before).toBeGreaterThan(0);
    store.markRead('n1');
    expect(store.unreadCount()).toBe(before - 1);
    store.markAllRead();
    expect(store.unreadCount()).toBe(0);
  });

  it('enviar un mensaje lo agrega a la conversación', () => {
    store.setActiveTab('chats');
    const n = store.messages().length;
    store.onDraft('Voy en camino');
    store.send();
    expect(store.messages().length).toBe(n + 1);
    expect(store.messages()[store.messages().length - 1].text).toBe('Voy en camino');
  });

  it('guardar perfil valida teléfono de 9 dígitos', () => {
    store.openEditProfile();
    store.onPfField('phone', '123');
    store.saveProfile();
    expect(store.profileErrors()['phone']).toBeTruthy();
  });

  it('guardar perfil con datos válidos lo persiste en el servidor', () => {
    store.openEditProfile();
    store.onPfField('name', 'Marco Q. Rojas');
    store.saveProfile();
    expect(store.profile().name).toBe('Marco Q. Rojas');
    expect(store.editProfile()).toBe(false);
  });

  // --- Reclamo y coordinación de la recolección ---
  const pickup = (id: string) => store.pickups().find((r) => r.id === id)!;

  it('un recojo Creada ofrece Coordinar y no deja escanear el QR todavía', () => {
    const row = pickup('r2');
    expect(row.state).toBe('Creada');
    expect(row.canCoordinate).toBe(true);
    expect(row.canScan).toBe(false);
    expect(row.canStartRoute).toBe(false);
    store.openScannerRow('r2');
    expect(store.dialog()).toBe('');
  });

  it('coordinar → iniciar recorrido → QR recorre el ciclo completo', () => {
    store.coordinate('r2');
    expect(store.dialog()).toBe('coordinar');
    store.onScheduleDate('2030-03-10');
    store.onScheduleSlot('manana');
    store.confirmAction();
    expect(pickup('r2').state).toBe('Coordinada');
    expect(pickup('r2').canStartRoute).toBe(true);
    expect(pickup('r2').canScan).toBe(true);

    store.startRoute('r2');
    expect(pickup('r2').state).toBe('En camino');

    store.openScannerRow('r2');
    expect(store.dialog()).toBe('qr');
    store.onManualCode('qh-r2');
    store.confirmManual();
    expect(pickup('r2').state).toBe('Completado');
    expect(store.rateOpen()).toBe(true);
  });

  // --- Defecto 1: lo que se reclama en el mapa aparece en Recojos ---
  it('un anuncio reclamado en el mapa aparece en Recojos como Creada', () => {
    const before = store.pickups().length;
    store.claim('a3');
    expect(store.pickups().length).toBe(before + 1);
    const nuevo = store.pickups().find((p) => p.publicationId === 3)!;
    expect(nuevo.state).toBe('Creada');
    expect(nuevo.person).toBe('Generador 3');
    expect(nuevo.canCoordinate).toBe(true);
  });

  // --- Defecto 2: las pestañas Activos / Completados / Cancelados filtran ---
  it('las pestañas separan recojos activos, completados y cancelados', () => {
    expect(store.deliveryTab()).toBe('activos');
    expect(store.activePickups()).toBe(3);
    expect(store.completedPickups()).toBe(1);
    expect(store.canceledPickups()).toBe(0);
    store.openAction('cancelar', 'r2');
    store.onReason('Ya no puedo');
    store.confirmAction();
    expect(store.activePickups()).toBe(2);
    expect(store.canceledPickups()).toBe(1);
    store.setDeliveryTab('cancelados');
    expect(store.deliveryTab()).toBe('cancelados');
    store.seedFromQuery({ get: (k: string) => (k === 'tab' ? 'completados' : null) });
    expect(store.deliveryTab()).toBe('completados');
  });

  // --- Publicar (generador) ---
  describe('como generador', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      setup('generador');
    });

    const fill = () => {
      store.toggleMat('pet');
      store.setQty('12');
      store.setPubDate('2030-01-20');
      store.setPubAddress('Av. Pershing 345');
    };

    it('publicar valida los campos obligatorios', () => {
      store.publishAd();
      expect(store.pubErrors()['qty']).toBeTruthy();
      expect(store.pubErrors()['date']).toBeTruthy();
      expect(store.pubErrors()['address']).toBeTruthy();
      expect(api.calls).not.toContain('createPublication');
    });

    it('publicar crea la publicación en el servidor y navega a Publicaciones', () => {
      fill();
      store.publishAd();
      expect(api.calls).toContain('createPublication');
      expect(store.publications()[0].state).toBe('Esperando');
      expect(navigate).toHaveBeenCalledWith(['/app', 'publicaciones']);
    });

    it('una publicación admite un único material (el chip elegido reemplaza al anterior)', () => {
      store.toggleMat('pet');
      store.toggleMat('vidrio');
      expect(store.materials()).toEqual({ vidrio: true });
    });

    it('un pago con método exige monto', () => {
      fill();
      store.selectPay('Yape');
      store.publishAd();
      expect(store.errAmount()).toContain('monto');
    });

    it('una nota que supera el límite bloquea Publicar con un error', () => {
      fill();
      store.onNote('x'.repeat(store.noteLimit + 1));
      expect(store.noteOver()).toBe(true);
      store.publishAd();
      expect(store.errNote()).toContain('límite');
      expect(api.calls).not.toContain('createPublication');
    });

    it('una publicación nueva admite reprogramar por fila solo cuando tiene solicitud', () => {
      fill();
      store.publishAd();
      const id = store.publications()[0].id;
      expect(store.publications()[0].canTrack).toBe(false);
      store.cancel(id);
      expect(store.dialog()).toBe('cancelar');
    });

    // --- Defecto 3: perfil y chat del generador muestran SUS datos, no los del reciclador ---
    it('el generador ve a su contraparte real en el chat y no los datos del reciclador', () => {
      api.mine = [{ id: 1, cantidad: 10, material: 'cartón', fechaPublicacion: '2030-01-01T10:00:00', estado: 'reservado', reciclador: 'Reciclador Pérez', fechaCoordinada: null, solicitudId: 1, franjaHoraria: null, unidadMedida: 'kg' }];
      store.load();
      store.setActiveTab('chats');
      expect(store.threads().map((t) => t.name)).toEqual(['Reciclador Pérez']);
      expect(store.activeName()).toBe('Reciclador Pérez');
      expect(store.counterpart()).toEqual({ rating: '4.5', deliveries: '12', verified: 'Sí' });
    });

    it('al valorar al reciclador de una publicación completada se envía la calificación', () => {
      api.mine = [{ id: 1, cantidad: 10, material: 'cartón', fechaPublicacion: '2030-01-01T10:00:00', estado: 'recolectado', reciclador: 'Reciclador Pérez', fechaCoordinada: null, solicitudId: 1, franjaHoraria: null, unidadMedida: 'kg' }];
      store.load();
      store.openRate('g1');
      expect(store.rateOpen()).toBe(true);
      store.setRating(5);
      store.submitRating();
      expect(api.calls).toContain('rate:1:5');
      expect(store.rateOpen()).toBe(false);
    });

    it('reset() limpia los datos del usuario anterior', () => {
      api.mine = [{ id: 1, cantidad: 10, material: 'cartón', fechaPublicacion: '2030-01-01T10:00:00', estado: 'disponible', reciclador: null, fechaCoordinada: null, solicitudId: null, franjaHoraria: null, unidadMedida: 'kg' }];
      store.load();
      expect(store.profile().name).toBe('Marco Quispe');
      store.reset();
      expect(store.profile().name).toBe('');
      expect(store.publications()).toEqual([]);
      expect(store.threads()).toEqual([]);
    });
  });

  // --- Comprobante CSV del historial ---
  it('el historial se exporta a CSV con cabecera y una fila por actividad', () => {
    const csv = store.historyCsv();
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('Tipo');
    expect(lines.length).toBe(store.history().length + 1);
    expect(csv).toContain('Emilia Valencia');
  });

  // --- Disponibilidad / visibilidad ---
  it('el interruptor de visibilidad alterna entre Activa y Oculta', () => {
    expect(store.visibilityLabel()).toBe('Activa');
    store.toggleAvailability();
    expect(store.available()).toBe(false);
    expect(store.visibilityLabel()).toBe('Oculta');
  });

  // --- Soporte: reporte con evidencia ---
  it('un reporte con evidencia crea un ticket Abierto en el servidor', () => {
    store.selectReportCategory('Material distinto');
    store.onReportText('El material no coincide con el anuncio.');
    store.onReportFile({ files: [{ name: 'foto-evidencia.jpg', type: 'text/plain' }] } as unknown as HTMLInputElement);
    store.sendReport();
    const ticket = store.ticketsView()[0];
    expect(ticket.state).toBe('Abierto');
    expect(ticket.meta).toContain('Material distinto');
    expect(ticket.meta).toContain('evidencia');
  });

  it('un reporte vacío no se envía', () => {
    store.sendReport();
    expect(store.reportError()).toContain('Cuéntanos');
    expect(store.ticketsView().length).toBe(0);
  });

  // --- Deep links documentados (seedFromQuery) ---
  const qp = (obj: Record<string, string>) => ({ get: (k: string) => (k in obj ? obj[k] : null) });

  it('deep link del mapa: view, material y filtro', () => {
    store.seedFromQuery(qp({ view: 'puntos', material: 'pet', near: '1' }));
    expect(store.mapView()).toBe('puntos');
    expect(store.mapMaterial()).toBe('pet');
    expect(store.filters()['Cerca de mí']).toBe(true);
  });

  it('deep link de ruta vacía', () => {
    store.seedFromQuery(qp({ stops: 'none' }));
    expect(store.routeIds()).toEqual([]);
  });

  it('deep link que abre Editar perfil y un hilo de chat', () => {
    store.seedFromQuery(qp({ thread: 't2', edit: 'perfil' }));
    expect(store.thread()).toBe('t2');
    expect(store.editProfile()).toBe(true);
    expect(store.profileForm()).not.toBeNull();
  });

  it('deep link que abre el diálogo de reprogramación precargado', () => {
    store.seedFromQuery(qp({ dialog: 'reprogramar', row: 'r2', date: '2030-05-05', slot: 'tarde' }));
    expect(store.dialog()).toBe('reprogramar');
    expect(store.actionRow()).toBe('r2');
    expect(store.scheduleDate()).toBe('2030-05-05');
    expect(store.scheduleSlot()).toBe('tarde');
  });

  it('deep link ignora valores desconocidos y no puede cambiar el rol', () => {
    store.seedFromQuery(qp({ material: 'oro', role: 'generador', view: 'galaxia' }));
    expect(store.mapMaterial()).toBe('');
    expect(store.role()).toBe('reciclador');
    expect(store.mapView()).toBe('anuncios');
  });
});
