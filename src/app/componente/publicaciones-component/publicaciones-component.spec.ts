import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { MiPublicacionDTO } from '../../model/publicacion';
import { toRow } from '../../core/entregas';
import { AccionDialogComponent } from '../accion-dialog-component/accion-dialog-component';
import { ValorarDialogComponent } from '../valorar-dialog-component/valorar-dialog-component';
import { SeguimientoDialogComponent } from '../seguimiento-dialog-component/seguimiento-dialog-component';
import { PublicacionesComponent } from './publicaciones-component';

// Anuncios del generador: valorar, seguir al recolector y cancelar.
describe('PublicacionesComponent', () => {
  let fixture: ComponentFixture<PublicacionesComponent>;
  let c: PublicacionesComponent;
  let api: FakeApi;

  const pub = (estado: string, solicitudId: number | null): MiPublicacionDTO => ({
    id: 1, cantidad: 10, material: 'cartón', fechaPublicacion: '2030-01-01T10:00:00', estado,
    reciclador: solicitudId ? 'Reciclador Pérez' : null, fechaCoordinada: null, solicitudId, franjaHoraria: null, unidadMedida: 'kg',
  });

  function setup(mine: MiPublicacionDTO[], prepare: (api: FakeApi) => void = () => undefined) {
    localStorage.clear();
    api = new FakeApi();
    api.mine = mine;
    prepare(api);
    TestBed.configureTestingModule({ imports: [PublicacionesComponent], providers: [...testProviders(api), routeWith()] });
    login('gen@qhurinet.pe');
    fixture = TestBed.createComponent(PublicacionesComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  }

  const hijo = <T>(tipo: new (...args: never[]) => T): T | undefined => {
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(tipo))?.componentInstance as T | undefined;
  };

  it('una publicación nueva aparece «Esperando» y sin seguimiento', () => {
    setup([pub('disponible', null)]);
    expect(c.filas[0].state).toBe('Esperando');
    expect(toRow(c.filas[0]).canTrack).toBeFalse();
  });

  it('una publicación sin reclamar se puede cancelar con motivo', () => {
    setup([pub('disponible', null)]);
    c.onAccion({ tipo: 'cancelar', id: 'g1' });
    const d = hijo(AccionDialogComponent)!;
    d.form.patchValue({ motivo: 'Ya lo regalé' });
    d.confirmar();
    expect(c.filas[0].state).toBe('Cancelado');
  });

  it('al valorar al reciclador de una publicación completada se envía la calificación', () => {
    setup([pub('recolectado', 1)]);
    expect(toRow(c.filas[0]).canRate).toBeTrue();
    c.onAccion({ tipo: 'valorar', id: 'g1' });
    const v = hijo(ValorarDialogComponent)!;
    expect(v.esGenerador).toBeTrue();
    v.setRating(5);
    v.enviar();
    expect(api.calls).toContain('rate:1:5');
    expect(hijo(ValorarDialogComponent)).toBeUndefined();
  });

  it('«Seguir recolector» abre el seguimiento cuando la solicitud está en camino', () => {
    setup([pub('reservado', 1)], (a) => (a.reqs[0].estado = 'en_camino'));
    expect(c.filas[0].state).toBe('En camino');
    c.onAccion({ tipo: 'seguir', id: 'g1' });
    expect(hijo(SeguimientoDialogComponent)).toBeDefined();
  });

  it('una publicación reclamada queda «Reclamado» con el nombre del reciclador', () => {
    setup([pub('reservado', 1)]);
    expect(c.filas[0].state).toBe('Reclamado');
    expect(c.filas[0].person).toBe('Reciclador Pérez');
  });
});
