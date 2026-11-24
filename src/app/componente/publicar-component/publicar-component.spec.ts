import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { PublicarComponent } from './publicar-component';

// Formulario reactivo de Publicar (generador): validaciones, publicación, borrador y sugerencia.
describe('PublicarComponent', () => {
  let fixture: ComponentFixture<PublicarComponent>;
  let c: PublicarComponent;
  let api: FakeApi;
  let navigate: jasmine.Spy;

  function crear() {
    fixture = TestBed.createComponent(PublicarComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  }

  beforeEach(() => {
    localStorage.clear();
    api = new FakeApi();
    TestBed.configureTestingModule({ imports: [PublicarComponent], providers: [...testProviders(api), routeWith()] });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    login('gen@qhurinet.pe');
    crear();
  });

  const llenar = () => {
    c.toggleMat('pet');
    c.setQty(12);
    c.form.patchValue({ date: new Date(2030, 0, 20), address: 'Av. Pershing 345' });
  };

  it('publicar valida los campos obligatorios y no llama al servidor', () => {
    c.publishAd();
    expect(c.errores['qty']).toBe('Ingresa la cantidad aproximada en kilos.');
    expect(c.errores['date']).toBe('Elige una fecha válida desde hoy.');
    expect(c.errores['address']).toBe('Indica la dirección de recojo.');
    expect(api.calls).not.toContain('createPublication');
  });

  it('la cantidad debe ser mayor que cero', () => {
    llenar();
    c.form.patchValue({ qty: '0' });
    c.publishAd();
    expect(c.errores['qty']).toBe('La cantidad debe ser mayor que cero.');
  });

  it('una fecha pasada no se acepta', () => {
    llenar();
    c.form.patchValue({ date: new Date(2000, 0, 1) });
    c.publishAd();
    expect(c.errores['date']).toBe('Elige una fecha válida desde hoy.');
  });

  it('publicar crea la publicación en el servidor y navega a Publicaciones', () => {
    llenar();
    c.publishAd();
    expect(api.calls).toContain('createPublication');
    expect(navigate).toHaveBeenCalledWith(['/app', 'publicaciones']);
    expect(c.form.value.address).toBe('');
  });

  it('una publicación admite un único material (el chip elegido reemplaza al anterior)', () => {
    c.toggleMat('pet');
    c.toggleMat('vidrio');
    expect(c.materials).toEqual({ vidrio: true });
  });

  it('sin material elegido muestra el error', () => {
    llenar();
    c.toggleMat('pet');
    c.publishAd();
    expect(c.errores['mats']).toBe('Elige un tipo de material.');
  });

  it('un pago con método exige monto', () => {
    llenar();
    c.selectPay('Yape');
    c.publishAd();
    expect(c.errores['amount']).toContain('monto');
  });

  it('una nota que supera el límite bloquea Publicar con un error', () => {
    llenar();
    c.form.patchValue({ note: 'x'.repeat(c.noteLimit + 1) });
    expect(c.noteOver()).toBeTrue();
    c.publishAd();
    expect(c.errores['note']).toContain('límite');
    expect(api.calls).not.toContain('createPublication');
  });

  it('la clasificación con IA (Gemini) propone un material tras dejar de escribir y lo aplica', fakeAsync(() => {
    c.toggleMat('pet'); // material distinto al que sugerirá la IA
    c.form.patchValue({ note: 'Son varias cajas de cartón' });
    tick(700); // debounce antes de llamar a POST /materials/classify
    const s = c.sugerencia()!;
    expect(s.mat).toBe('carton');
    expect(s.confidence).toBe(95);
    c.applySuggestion(s);
    expect(c.materials).toEqual({ carton: true });
    expect(api.log).toContain('POST /materials/classify');
  }));

  it('sin coincidencia de Gemini no hay sugerencia', fakeAsync(() => {
    c.form.patchValue({ note: 'el clima de mañana' });
    tick(700);
    expect(c.sugerencia()).toBeNull();
  }));

  it('el borrador se guarda en este navegador y se restaura al volver', () => {
    llenar();
    c.saveDraft();
    expect(c.draftNotice).toBe('Borrador guardado.');
    crear();
    expect(c.materials).toEqual({ pet: true });
    expect(c.form.value.address).toBe('Av. Pershing 345');
    expect(c.form.value.qty).toBe('12');
  });

  it('la vista previa refleja el formulario', () => {
    llenar();
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('12 kg');
    expect(texto).toContain('PET');
    expect(texto).toContain('Av. Pershing 345');
  });
});
