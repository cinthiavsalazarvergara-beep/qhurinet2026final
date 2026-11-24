import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { ChatsComponent } from './chats-component';

// Chats: hilos por solicitud, envío de mensajes y datos reales de la contraparte.
describe('ChatsComponent', () => {
  let fixture: ComponentFixture<ChatsComponent>;
  let c: ChatsComponent;
  let api: FakeApi;

  function setup(email: 'rec@qhurinet.pe' | 'gen@qhurinet.pe', query: Record<string, string> = {}, prepare: (a: FakeApi) => void = () => undefined) {
    localStorage.clear();
    api = new FakeApi();
    prepare(api);
    TestBed.configureTestingModule({ imports: [ChatsComponent], providers: [...testProviders(api), routeWith(query)] });
    login(email);
    fixture = TestBed.createComponent(ChatsComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  }

  it('el reciclador ve un hilo por recojo y abre el primero con sus mensajes', () => {
    setup('rec@qhurinet.pe');
    expect(c.hilos.map((h) => h.id)).toEqual(['t1', 't2', 't3', 't4']);
    expect(c.hiloActivo?.id).toBe('t1');
    expect(c.mensajes.map((m) => m.texto)).toEqual(['Hola']);
    expect(c.contraparte).toEqual({ rating: '4.5', deliveries: '12', verified: 'Sí' });
  });

  it('enviar un mensaje lo agrega a la conversación', () => {
    setup('rec@qhurinet.pe');
    c.form.setValue({ texto: 'Voy en camino' });
    c.enviar();
    expect(c.mensajes.length).toBe(2);
    expect(c.mensajes[1].texto).toBe('Voy en camino');
    expect(c.mensajes[1].mio).toBeTrue();
    expect(c.form.value.texto).toBe('');
  });

  it('un mensaje vacío no se envía', () => {
    setup('rec@qhurinet.pe');
    c.form.setValue({ texto: '   ' });
    c.enviar();
    expect(api.log).not.toContain('POST /collection-requests/1/messages');
  });

  it('?thread=t2 abre ese hilo', () => {
    setup('rec@qhurinet.pe', { thread: 't2' });
    expect(c.hiloActivo?.id).toBe('t2');
    expect(c.subtitulo()).toBe('20 kg · Cartón');
  });

  it('el reciclador puede ingresar el código de una entrega coordinada', () => {
    setup('rec@qhurinet.pe');
    expect(c.puedeEscanear()).toBeTrue();
    c.abrirEscaner();
    expect(c.entregaEscaner?.id).toBe('r1');
  });

  it('el generador ve a su contraparte real y no los datos del reciclador', () => {
    setup('gen@qhurinet.pe', {}, (a) => (a.mine = [{ id: 1, cantidad: 10, material: 'cartón', fechaPublicacion: '2030-01-01T10:00:00', estado: 'reservado', reciclador: 'Reciclador Pérez', fechaCoordinada: null, solicitudId: 1, franjaHoraria: null, unidadMedida: 'kg' }]));
    expect(c.hilos.map((t) => t.name)).toEqual(['Reciclador Pérez']);
    expect(c.hiloActivo?.name).toBe('Reciclador Pérez');
    expect(c.contraparte).toEqual({ rating: '4.5', deliveries: '12', verified: 'Sí' });
  });

  it('el generador consulta el código de entrega para dictarlo', () => {
    setup('gen@qhurinet.pe', {}, (a) => (a.mine = [{ id: 1, cantidad: 10, material: 'cartón', fechaPublicacion: '2030-01-01T10:00:00', estado: 'reservado', reciclador: 'Reciclador Pérez', fechaCoordinada: null, solicitudId: 1, franjaHoraria: null, unidadMedida: 'kg' }]));
    expect(c.puedeMostrarCodigo()).toBeTrue();
    c.mostrarCodigo();
    expect(c.codigo).toBe('qh-r1');
  });

  it('sin entregas reclamadas no hay conversaciones', () => {
    setup('gen@qhurinet.pe');
    fixture.detectChanges();
    expect(c.hilos).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aún no tienes conversaciones');
  });
});
