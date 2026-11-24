import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';

/** Datos de la ruta a guardar. */
export class RutaNueva {
  nombre: string;
  descripcion: string;
}

/** Modal «Guardar ruta»: nombre obligatorio y al menos una parada. */
@Component({
  selector: 'app-guardar-ruta-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, A11yModule],
  templateUrl: './guardar-ruta-dialog-component.html',
  styleUrl: './guardar-ruta-dialog-component.css',
})
export class GuardarRutaDialogComponent {
  /** Resumen de la ruta («3 paradas · 2,1 km · 12 min»). */
  @Input() resumen = '';
  @Input() sinParadas = false;
  @Output() guardar = new EventEmitter<RutaNueva>();
  @Output() cerrar = new EventEmitter<void>();

  fb: FormBuilder = inject(FormBuilder);
  form: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });
  error = '';

  confirmar(): void {
    const nombre = String(this.form.value.nombre ?? '').trim();
    if (!nombre) {
      this.error = 'Ingresa un nombre para la ruta.';
      return;
    }
    if (this.sinParadas) {
      this.error = 'Agrega al menos una parada antes de guardar.';
      return;
    }
    this.guardar.emit({ nombre: nombre.slice(0, 60), descripcion: String(this.form.value.descripcion ?? '').trim().slice(0, 240) });
  }
}
