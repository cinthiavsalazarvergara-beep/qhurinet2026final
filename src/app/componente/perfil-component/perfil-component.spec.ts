import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FakeApi } from '../../testing/fake-api';
import { login, routeWith, testProviders } from '../../testing/test-config';
import { LoginService } from '../../services/login-service';
import { EditarPerfilDialogComponent } from '../editar-perfil-dialog-component/editar-perfil-dialog-component';
import { MetodoPagoDialogComponent } from '../metodo-pago-dialog-component/metodo-pago-dialog-component';
import { DocumentosDialogComponent } from '../documentos-dialog-component/documentos-dialog-component';
import { PerfilComponent } from './perfil-component';

// Perfil: datos del servidor, visibilidad, edición, pagos, documentos e historial.
describe('PerfilComponent', () => {
  let fixture: ComponentFixture<PerfilComponent>;
  let c: PerfilComponent;
  let navigate: jasmine.Spy;

  function setup(query: Record<string, string> = {}) {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [PerfilComponent], providers: [...testProviders(new FakeApi()), routeWith(query)] });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    login('rec@qhurinet.pe');
    fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    c = fixture.componentInstance;
  }

  const hijo = <T>(tipo: new (...args: never[]) => T): T | undefined => {
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(tipo))?.componentInstance as T | undefined;
  };
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('muestra los datos reales del perfil e historial', () => {
    setup();
    expect(c.perfil.name).toBe('Marco Quispe');
    expect(c.perfil.phone).toBe('+51 987 654 321');
    expect(c.rating()).toBe('4.8');
    expect(texto()).toContain('Emilia Valencia');
    expect(texto()).toContain('Pago en mano al entregar');
  });

  it('el interruptor de visibilidad alterna entre Activa y Oculta', () => {
    setup();
    expect(c.visibilidad()).toBe('Activa');
    c.toggleDisponible();
    expect(c.disponible).toBeFalse();
    expect(c.visibilidad()).toBe('Oculta');
  });

  it('?edit=perfil abre Editar perfil, que valida el teléfono de 9 dígitos', () => {
    setup({ edit: 'perfil' });
    const d = hijo(EditarPerfilDialogComponent)!;
    d.form.patchValue({ phone: '123' });
    d.guardar();
    expect(d.errores['phone']).toBe('Ingresa un teléfono de 9 dígitos.');
  });

  it('guardar el perfil con datos válidos lo persiste en el servidor y cierra el diálogo', () => {
    setup();
    c.editarAbierto = true;
    const d = hijo(EditarPerfilDialogComponent)!;
    d.form.patchValue({ name: 'Marco Q. Rojas' });
    d.guardar();
    expect(c.perfil.name).toBe('Marco Q. Rojas');
    expect(hijo(EditarPerfilDialogComponent)).toBeUndefined();
  });

  it('agregar un método de pago valida el celular y lo guarda como predeterminado', () => {
    setup({ pay: '1' });
    const d = hijo(MetodoPagoDialogComponent)!;
    d.form.setValue({ dato: '123' });
    d.guardar();
    expect(d.error).toBe('Ingresa un celular de 9 dígitos.');
    d.form.setValue({ dato: '987654321' });
    d.guardar();
    expect(c.metodos.find((m) => m.label === 'YAPE')?.isDefault).toBeTrue();
    expect(c.metodos.find((m) => m.label === 'YAPE')?.detail).toBe('987 ••• 321');
  });

  it('subir un documento sin archivo muestra el error', () => {
    setup({ docs: '1' });
    const d = hijo(DocumentosDialogComponent)!;
    d.subir();
    expect(d.error).toContain('Selecciona un archivo');
  });

  it('cerrar sesión borra la sesión y vuelve al login', () => {
    setup();
    c.logout();
    expect(TestBed.inject(LoginService).isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
