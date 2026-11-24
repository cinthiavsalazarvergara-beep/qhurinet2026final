import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { map, of, switchMap } from 'rxjs';
import { Profile } from '../../model/profile';
import { PerfilUsuarioDTO } from '../../model/perfil-usuario';
import { CategoriaMaterialDTO } from '../../model/categoria-material';
import { MAT_ORDER, MATERIALS } from '../../model/material';
import { PerfilService } from '../../services/perfil-service';
import { matKey } from '../../core/mappers';
import { readFile } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';

/** Modal «Editar perfil»: nombre, teléfono, descripción, materiales y foto. */
@Component({
  selector: 'app-editar-perfil-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, A11yModule],
  templateUrl: './editar-perfil-dialog-component.html',
  styleUrl: './editar-perfil-dialog-component.css',
})
export class EditarPerfilDialogComponent implements OnInit {
  @Input() perfil: Profile;
  @Input() esGenerador = false;
  @Input() categorias: CategoriaMaterialDTO[] = [];
  /** Se emite con el perfil ya guardado en el servidor. */
  @Output() guardado = new EventEmitter<PerfilUsuarioDTO>();
  @Output() cerrar = new EventEmitter<void>();

  fb: FormBuilder = inject(FormBuilder);
  perfilService: PerfilService = inject(PerfilService);

  form: FormGroup;
  mats: string[] = [];
  foto = '';
  errores: Record<string, string> = {};
  private archivoFoto: File | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.perfil.name, Validators.required],
      phone: [this.perfil.phone, Validators.pattern(/^(\+?51)?[\s\d]*$/)],
      bio: [this.perfil.bio],
    });
    this.mats = this.perfil.mats.slice();
    this.foto = this.perfil.photo;
  }

  inicial(): string {
    return String(this.form.value.name ?? '').trim()[0] || 'M';
  }

  matChips(): { key: string; label: string; active: boolean }[] {
    return MAT_ORDER.map((k) => ({ key: k, label: MATERIALS[k].label, active: this.mats.includes(k) }));
  }

  toggleMat(k: string): void {
    this.mats = this.mats.includes(k) ? this.mats.filter((m) => m !== k) : [...this.mats, k];
  }

  limpiarError(campo: string): void {
    this.errores = { ...this.errores, [campo]: '' };
  }

  onFoto(event: Event): void {
    readFile(event.target as HTMLInputElement, (_nombre, url, file) => {
      if (url) {
        this.archivoFoto = file;
        this.foto = url;
      }
    });
  }

  quitarFoto(): void {
    this.archivoFoto = null;
    this.foto = '';
  }

  guardar(): void {
    const v = this.form.value;
    const errores: Record<string, string> = {};
    const telefono = String(v.phone ?? '');
    if (!String(v.name ?? '').trim()) errores['name'] = 'El nombre no puede quedar vacío.';
    if (!/^\d{9}$/.test(telefono.replace(/^\+?51/, '').replace(/\D/g, ''))) errores['phone'] = 'Ingresa un teléfono de 9 dígitos.';
    if (!this.mats.length && !this.esGenerador) errores['mats'] = 'Elige al menos un material.';
    if (Object.keys(errores).length) {
      this.errores = errores;
      return;
    }
    const ids = this.mats
      .map((k) => this.categorias.find((c) => matKey(c.nombre) === k)?.id)
      .filter((x): x is number => x !== undefined);
    const archivo = this.archivoFoto;
    this.perfilService.update({
      nombreCompleto: String(v.name).trim().slice(0, 60),
      telefono: telefono.replace(/\s/g, ''),
      descripcion: String(v.bio ?? '').trim().slice(0, 240),
      materialesIds: ids,
    }).pipe(
      switchMap((p) => (archivo ? this.perfilService.uploadAvatar(archivo).pipe(map((a) => ({ ...p, fotoPerfilUrl: a.fotoPerfilUrl }))) : of(p))),
    ).subscribe({
      next: (p) => this.guardado.emit(p),
      error: (e) => (this.errores = { form: errorMessage(e) }),
    });
  }
}
