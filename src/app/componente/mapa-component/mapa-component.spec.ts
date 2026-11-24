import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { RutaService } from '../../services/ruta-service';
import { BusquedaService } from '../../services/busqueda-service';
import { EscanerDialogComponent } from '../escaner-dialog-component/escaner-dialog-component';
import { GuardarRutaDialogComponent } from '../guardar-ruta-dialog-component/guardar-ruta-dialog-component';
import { MapaComponent } from './mapa-component';

// Mapa del reciclador contra el backend en memoria: reclamar, ruta, filtros, deep links y QR.
describe('MapaComponent', () => {
  let fixture: ComponentFixture<MapaComponent>;
  let c: MapaComponent;
  let api: FakeApi;
  let ruta: RutaService;

  function setup(query: Record<string, string> = {}) {
    localStorage.clear();
    api = new FakeApi();
    TestBed.configureTestingModule({ imports: [MapaComponent], providers: [...testProviders(api), routeWith(query)] });
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    login('rec@qhurinet.pe');
    ruta = TestBed.inject(RutaService);
    fixture = TestBed.createComponent(MapaComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  }

  const pickup = (pubId: number) => c.pickups.find((p) => p.publicationId === pubId);

  it('arranca con los anuncios ya reclamados (a1, a2) en la ruta de trabajo', () => {
    setup();
    expect(ruta.stops).toEqual(['a1', 'a2']);
    expect(c.claimed).toEqual({ a1: true, a2: true, a103: true, a104: true });
    expect(c.paradas.map((p) => p.id)).toEqual(['a1', 'a2']);
  });

  it('reclamar un anuncio lo marca, lo agrega a la ruta y crea el recojo «Creada»', () => {
    setup();
    c.claim('a3');
    expect(c.claimed['a3']).toBeTrue();
    expect(ruta.stops).toContain('a3');
    expect(pickup(3)?.state).toBe('Creada');
    expect(pickup(3)?.person).toBe('Generador 3');
  });

  it('el botón Reclamar de la tarjeta llama al servidor', () => {
    setup();
    const card = (fixture.nativeElement as HTMLElement).querySelector('[data-ad-card="a3"] .boton-reclamar') as HTMLButtonElement;
    card.click();
    fixture.detectChanges();
    expect(api.log).toContain('POST /collection-requests');
    expect(card.textContent?.trim()).toBe('Reclamado');
  });

  it('un anuncio que ya no está disponible muestra el error del servidor', () => {
    setup();
    c.claim('a3');
    api.pubs[3].estado = 'reservado';
    c.claim('a4');
    fixture.detectChanges();
    expect(c.error).toContain('ya no está disponible');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ya no está disponible');
  });

  it('agregar y quitar una parada de punto', () => {
    setup();
    c.addToRoute('p1');
    expect(ruta.stops).toContain('p1');
    c.removeStop('p1');
    expect(ruta.stops).not.toContain('p1');
  });

  it('optimizar la ruta llama al back (OSRM) y usa su orden para los puntos', () => {
    setup();
    ruta.stops = ['p1', 'p2', 'a1'];
    c.optimizeRoute();
    expect(api.log).toContain('POST /routes/optimize');
    expect(c.optimized).toBeTrue();
    expect(c.routeNotice).toContain('OSRM');
    expect(ruta.stops).toEqual(['p2', 'p1', 'a1']); // el back devuelve el orden invertido en la FakeApi
  });

  it('optimizar sin puntos de reciclaje no llama al back y lo avisa', () => {
    setup();
    ruta.stops = ['a1', 'a2'];
    c.optimizeRoute();
    expect(api.log).not.toContain('POST /routes/optimize');
    expect(c.routeNotice).toContain('anuncios');
  });

  it('filtros del mapa: material y buscador de la cabecera', () => {
    setup();
    c.onChip({ label: 'Vidrio', key: 'vidrio', active: false, kind: 'material' });
    expect(c.anuncios.length).toBeGreaterThan(0);
    expect(c.anuncios.every((a) => a.mat === 'vidrio')).toBeTrue();
    c.onChip({ label: 'Vidrio', key: 'vidrio', active: true, kind: 'material' });
    TestBed.inject(BusquedaService).setTexto('zzz-no-existe');
    expect(c.vacio).toBeTrue();
    c.clearMapFilters();
    expect(c.vacio).toBeFalse();
  });

  it('la leyenda oculta y vuelve a mostrar un tipo de punto', () => {
    setup();
    c.toggleLegend('acopio');
    expect(c.pointPins.length).toBe(0);
    c.toggleLegend('acopio');
    expect(c.pointPins.length).toBe(1);
  });

  it('guardar, cargar y eliminar una ruta', () => {
    setup();
    c.guardarAbierto = true;
    fixture.detectChanges();
    const dialogo = fixture.debugElement.query(By.directive(GuardarRutaDialogComponent)).componentInstance as GuardarRutaDialogComponent;
    dialogo.confirmar();
    expect(dialogo.error).toBe('Ingresa un nombre para la ruta.');
    dialogo.form.setValue({ nombre: 'Sábado', descripcion: '' });
    dialogo.confirmar();
    expect(c.rutasGuardadas.length).toBe(1);
    expect(c.routeNotice).toBe('Ruta guardada: Sábado');
    c.removeStop('a1');
    c.loadSavedRoute(c.rutasGuardadas[0]);
    expect(ruta.stops).toEqual(['a1', 'a2']);
    c.removeSavedRoute(c.rutasGuardadas[0]);
    expect(c.rutasGuardadas.length).toBe(0);
  });

  it('el QR de la ruta confirma la entrega y retira la parada', () => {
    setup();
    c.openScanner();
    expect(c.entregaEscaner?.id).toBe('r1');
    fixture.detectChanges();
    const dialogo = fixture.debugElement.query(By.directive(EscanerDialogComponent)).componentInstance as EscanerDialogComponent;
    dialogo.form.setValue({ codigo: 'qh-r1' });
    dialogo.confirmar();
    fixture.detectChanges();
    expect(c.entregaConfirmada?.id).toBe('r1');
    expect(c.pickups.find((p) => p.id === 'r1')?.state).toBe('Completado');
    expect(ruta.stops).not.toContain('a1');
  });

  it('deep link del mapa: view, material y filtro', () => {
    setup({ view: 'puntos', material: 'pet', near: '1' });
    expect(c.mapView).toBe('puntos');
    expect(c.mapMaterial).toBe('pet');
    expect(c.filters['Cerca de mí']).toBeTrue();
  });

  it('deep link de ruta vacía', () => {
    setup({ stops: 'none' });
    expect(ruta.stops).toEqual([]);
  });

  it('deep link ignora valores desconocidos', () => {
    setup({ material: 'oro', view: 'galaxia', type: 'nave' });
    expect(c.mapMaterial).toBe('');
    expect(c.mapView).toBe('anuncios');
    expect(c.pointType).toBe('');
  });
});
