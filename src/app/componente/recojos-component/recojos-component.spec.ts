import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { RutaService } from '../../services/ruta-service';
import { toRow } from '../../core/entregas';
import { AccionDialogComponent } from '../accion-dialog-component/accion-dialog-component';
import { EscanerDialogComponent } from '../escaner-dialog-component/escaner-dialog-component';
import { TablaEntregasComponent } from '../tabla-entregas-component/tabla-entregas-component';
import { RecojosComponent } from './recojos-component';

// Recojos del reciclador: coordinar, reprogramar, cancelar, prioridad, QR y pestañas.
describe('RecojosComponent', () => {
  let fixture: ComponentFixture<RecojosComponent>;
  let c: RecojosComponent;
  let navigate: jasmine.Spy;

  function setup(query: Record<string, string> = {}) {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [RecojosComponent], providers: [...testProviders(new FakeApi()), routeWith(query)] });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    login('rec@qhurinet.pe');
    fixture = TestBed.createComponent(RecojosComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  }

  const fila = (id: string) => c.filas.find((f) => f.id === id)!;
  const accion = () => {
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(AccionDialogComponent))?.componentInstance as AccionDialogComponent | undefined;
  };
  const escaner = () => {
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(EscanerDialogComponent))?.componentInstance as EscanerDialogComponent | undefined;
  };
  const tabla = () => fixture.debugElement.query(By.directive(TablaEntregasComponent)).componentInstance as TablaEntregasComponent;

  it('reprogramar una entrega cambia su ventana', () => {
    setup();
    c.onAccion({ tipo: 'reprogramar', id: 'r2' });
    const d = accion()!;
    d.form.patchValue({ fecha: '2030-01-15', franja: 'tarde' });
    d.confirmar();
    expect(fila('r2').state).toBe('Coordinada');
    expect(fila('r2').window).toBe('15/01 12:00–18:00');
    expect(accion()).toBeUndefined();
  });

  it('reprogramar con fecha pasada muestra error y no cambia la fila', () => {
    setup();
    c.onAccion({ tipo: 'reprogramar', id: 'r2' });
    const d = accion()!;
    d.form.patchValue({ fecha: '2000-01-01' });
    d.confirmar();
    expect(d.error).toBe('Elige una fecha válida desde hoy.');
    expect(fila('r2').state).toBe('Creada');
  });

  it('cancelar una entrega exige motivo y retira su parada de la ruta', () => {
    setup();
    TestBed.inject(RutaService).stops = ['a1', 'a2'];
    c.onAccion({ tipo: 'cancelar', id: 'r1' });
    const d = accion()!;
    d.confirmar();
    expect(d.error).toBe('Indica el motivo de la cancelación.');
    d.form.patchValue({ motivo: 'No había nadie en la dirección' });
    d.confirmar();
    expect(fila('r1').state).toBe('Cancelado');
    expect(TestBed.inject(RutaService).stops).toEqual(['a2']);
  });

  it('marcar prioridad resalta la fila', () => {
    setup();
    c.onAccion({ tipo: 'prioridad', id: 'r3' });
    expect(fila('r3').priority).toBeTrue();
    expect(toRow(fila('r3')).rowBg).toBe('#fdf3dd');
  });

  it('el escáner valida el código de entrega contra el servidor', () => {
    setup();
    c.onAccion({ tipo: 'escanear', id: 'r1' });
    const d = escaner()!;
    d.form.setValue({ codigo: 'qh-r9' });
    d.confirmar();
    expect(d.error).toContain('no corresponde');
    d.form.setValue({ codigo: 'qh-r1' });
    d.confirmar();
    fixture.detectChanges();
    expect(fila('r1').state).toBe('Completado');
    expect(c.entregaConfirmada?.id).toBe('r1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Entrega registrada');
  });

  it('el código se envía en minúsculas aunque se escriba en mayúsculas (el back usa UUID)', () => {
    setup();
    c.onAccion({ tipo: 'escanear', id: 'r1' });
    const d = escaner()!;
    d.form.setValue({ codigo: '  QH-R1 ' });
    d.confirmar();
    expect(d.error).toBe('');
    expect(fila('r1').state).toBe('Completado');
  });

  it('confirmar sin escribir el código pide ingresarlo', () => {
    setup();
    c.onAccion({ tipo: 'escanear', id: 'r1' });
    const d = escaner()!;
    d.confirmar();
    expect(d.error).toContain('Ingresa el código');
    expect(fila('r1').state).toBe('Coordinada');
  });

  it('un recojo Creada ofrece Coordinar y no deja escanear el QR todavía', () => {
    setup();
    const row = toRow(fila('r2'));
    expect(row.canCoordinate).toBeTrue();
    expect(row.canScan).toBeFalse();
    expect(row.canStartRoute).toBeFalse();
    c.onAccion({ tipo: 'escanear', id: 'r2' });
    expect(c.entregaEscaner).toBeNull();
  });

  it('coordinar → iniciar recorrido → QR recorre el ciclo completo', () => {
    setup();
    c.onAccion({ tipo: 'coordinar', id: 'r2' });
    expect(c.dialogo).toBe('coordinar');
    const d = accion()!;
    d.form.patchValue({ fecha: '2030-03-10', franja: 'manana' });
    d.confirmar();
    expect(fila('r2').state).toBe('Coordinada');
    expect(toRow(fila('r2')).canStartRoute).toBeTrue();

    c.onAccion({ tipo: 'iniciar', id: 'r2' });
    expect(fila('r2').state).toBe('En camino');

    c.onAccion({ tipo: 'escanear', id: 'r2' });
    const e = escaner()!;
    e.form.setValue({ codigo: 'qh-r2' });
    e.confirmar();
    expect(fila('r2').state).toBe('Completado');
  });

  it('las pestañas separan recojos activos, completados y cancelados', () => {
    setup();
    fixture.detectChanges();
    const cuenta = () => tabla().pestanas.map((p) => p.count);
    expect(cuenta()).toEqual([3, 1, 0]);
    c.onAccion({ tipo: 'cancelar', id: 'r2' });
    const d = accion()!;
    d.form.patchValue({ motivo: 'Ya no puedo' });
    d.confirmar();
    fixture.detectChanges();
    expect(cuenta()).toEqual([2, 1, 1]);
  });

  it('deep link ?tab=completados abre esa pestaña', () => {
    setup({ tab: 'completados' });
    expect(tabla().pestana).toBe('completados');
    expect(tabla().visibles.map((v) => v.id)).toEqual(['r4']);
  });

  it('deep link que abre el diálogo de reprogramación precargado', () => {
    setup({ dialog: 'reprogramar', row: 'r2', date: '2030-05-05', slot: 'tarde' });
    const d = accion()!;
    expect(c.dialogo).toBe('reprogramar');
    expect(d.entrega.id).toBe('r2');
    expect(d.form.value.fecha).toBe('2030-05-05');
    expect(d.form.value.franja).toBe('tarde');
  });

  it('abrir el chat de una fila navega a Chats con su hilo', () => {
    setup();
    c.onAccion({ tipo: 'chat', id: 'r2' });
    expect(navigate).toHaveBeenCalledWith(['/app', 'chats'], { queryParams: { thread: 't2' } });
  });
});
