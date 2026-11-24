import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { ReportarCasoComponent } from '../reportar-caso-component/reportar-caso-component';
import { MisTicketsComponent } from '../mis-tickets-component/mis-tickets-component';
import { SoporteComponent } from './soporte-component';

// Soporte: preguntas frecuentes y reporte de casos con evidencia.
describe('SoporteComponent', () => {
  let fixture: ComponentFixture<SoporteComponent>;
  let c: SoporteComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [SoporteComponent], providers: [...testProviders(new FakeApi()), routeWith()] });
    login('rec@qhurinet.pe');
    fixture = TestBed.createComponent(SoporteComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  });

  const reporte = () => fixture.debugElement.query(By.directive(ReportarCasoComponent)).componentInstance as ReportarCasoComponent;
  const tickets = () => fixture.debugElement.query(By.directive(MisTicketsComponent)).componentInstance as MisTicketsComponent;

  it('carga las preguntas frecuentes con la primera abierta', () => {
    expect(c.faqs.length).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Con el botón Reclamar.');
    c.toggleFaq(0);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Con el botón Reclamar.');
  });

  it('un reporte con evidencia crea un ticket Abierto en el servidor', () => {
    const r = reporte();
    r.categoria = 'Material distinto';
    r.form.setValue({ texto: 'El material no coincide con el anuncio.' });
    r.onArchivo({ target: { files: [{ name: 'foto-evidencia.jpg', type: 'text/plain' }] } } as unknown as Event);
    r.enviar();
    fixture.detectChanges();
    const t = tickets().tickets[0];
    expect(t.state).toBe('Abierto');
    expect(tickets().meta(t)).toContain('Material distinto');
    expect(tickets().meta(t)).toContain('evidencia');
    expect(r.aviso).toContain('creado');
  });

  it('un reporte vacío no se envía', () => {
    reporte().enviar();
    expect(reporte().error).toContain('Cuéntanos');
    expect(tickets().tickets.length).toBe(0);
  });
});
