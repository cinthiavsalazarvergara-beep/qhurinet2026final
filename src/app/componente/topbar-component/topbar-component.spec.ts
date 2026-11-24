import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { BusquedaService } from '../../services/busqueda-service';
import { TopbarComponent } from './topbar-component';

// Cabecera: notificaciones, estado del rol y buscador compartido con el mapa.
describe('TopbarComponent', () => {
  let fixture: ComponentFixture<TopbarComponent>;
  let c: TopbarComponent;

  function setup(email: 'rec@qhurinet.pe' | 'gen@qhurinet.pe' = 'rec@qhurinet.pe', query: Record<string, string> = {}) {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [TopbarComponent], providers: [...testProviders(new FakeApi()), routeWith(query)] });
    login(email);
    fixture = TestBed.createComponent(TopbarComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  }

  it('notificaciones: marcar una y todas', () => {
    setup();
    expect(c.sinLeer()).toBe(2);
    c.marcar('n1');
    expect(c.sinLeer()).toBe(1);
    c.marcarTodas();
    expect(c.sinLeer()).toBe(0);
  });

  it('la campana muestra el contador y ?notif=1 abre el panel', () => {
    setup('rec@qhurinet.pe', { notif: '1' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.notif-badge')?.textContent?.trim()).toBe('2');
    expect(el.textContent).toContain('2 SIN LEER');
  });

  it('el estado cuenta los recojos activos del reciclador', () => {
    setup();
    expect(c.estado()).toBe('3 RECOJOS ACTIVOS');
  });

  it('el estado del generador cuenta sus anuncios activos', () => {
    setup('gen@qhurinet.pe');
    expect(c.estado()).toBe('0 ANUNCIOS ACTIVOS');
  });

  it('escribir en el buscador lo comparte con el mapa', () => {
    setup();
    const input = (fixture.nativeElement as HTMLElement).querySelector('.search-input') as HTMLInputElement;
    input.value = 'Magdalena';
    input.dispatchEvent(new Event('input'));
    expect(TestBed.inject(BusquedaService).texto).toBe('Magdalena');
  });
});
