import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ErrorStateMatcher, provideNativeDateAdapter } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatFormField, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { CategoriaMaterialDTO } from '../../model/categoria-material';
import { CrearPublicacionDTO } from '../../model/publicacion';
import { MAT_ORDER, MATERIALS } from '../../model/material';
import { SLOT_LABELS, SLOT_OPTIONS, TIME_SLOTS } from '../../model/delivery';
import { PAY_OPTIONS, SUGGEST_RULES } from '../../model/support';
import { PublicacionService } from '../../services/publicacion-service';
import { CategoriaMaterialService } from '../../services/categoria-material-service';
import { PerfilService } from '../../services/perfil-service';
import { LoginService } from '../../services/login-service';
import { matKey } from '../../core/mappers';
import { isoDate, normalizeSearch, readFile, todayDate } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';
import { VistaPreviaAnuncioComponent } from '../vista-previa-anuncio-component/vista-previa-anuncio-component';

/** Distritos de Lima con coordenadas aproximadas (el backend exige latitud/longitud al publicar). */
export const DISTRICTS: Record<string, { lat: number; lng: number }> = {
  'San Isidro': { lat: -12.0974, lng: -77.0367 }, Miraflores: { lat: -12.1218, lng: -77.0296 },
  Magdalena: { lat: -12.0897, lng: -77.0709 }, 'Jesús María': { lat: -12.0774, lng: -77.0472 },
  Lince: { lat: -12.0841, lng: -77.0361 }, Surquillo: { lat: -12.1135, lng: -77.0186 },
  Barranco: { lat: -12.1456, lng: -77.0204 }, Surco: { lat: -12.1322, lng: -76.9967 },
  'San Borja': { lat: -12.101, lng: -76.993 }, 'Pueblo Libre': { lat: -12.0724, lng: -77.0632 },
  'San Miguel': { lat: -12.0773, lng: -77.0888 },
};

/** Límite de la nota: tope blando. Se deja escribir y, si se pasa, el error bloquea Publicar. */
export const NOTE_LIMIT = 200;

/** La cantidad debe ser un número mayor que cero (acepta coma decimal). */
function cantidadPositiva(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '');
  if (!v) return null;
  return parseFloat(v.replace(',', '.')) > 0 ? null : { noPositiva: true };
}

/** La fecha de recojo no puede ser anterior a hoy. */
function fechaDesdeHoy(control: AbstractControl): ValidationErrors | null {
  const d = control.value as Date | null;
  if (!d) return null;
  return isoDate(d) >= todayDate() ? null : { pasada: true };
}

/** Sugerencia de material a partir de la nota o del nombre de la foto. */
class Sugerencia {
  key: string;
  mat: string;
  label: string;
  confidence: number;
  source: string;
}

/** Pantalla Publicar del generador: formulario reactivo con Angular Material. */
@Component({
  selector: 'app-publicar-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ReactiveFormsModule, MatFormField, MatInput, MatPrefix, MatSuffix, MatSelect, MatOption,
    MatDatepicker, MatDatepickerInput, MatDatepickerToggle, MatButton, VistaPreviaAnuncioComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './publicar-component.html',
  styleUrl: './publicar-component.css',
})
export class PublicarComponent implements OnInit, OnDestroy {
  fb: FormBuilder = inject(FormBuilder);
  router: Router = inject(Router);
  publicacionService: PublicacionService = inject(PublicacionService);
  categoriaService: CategoriaMaterialService = inject(CategoriaMaterialService);
  perfilService: PerfilService = inject(PerfilService);
  loginService: LoginService = inject(LoginService);

  form: FormGroup;
  readonly noteLimit = NOTE_LIMIT;
  readonly minDate = new Date();
  readonly slotOptions = SLOT_OPTIONS;
  readonly districtOptions = Object.keys(DISTRICTS);
  readonly payOptions = PAY_OPTIONS;
  readonly cantidadesRapidas = [5, 10, 25];

  categorias: CategoriaMaterialDTO[] = [];
  /** El backend modela una publicación = un único material. */
  materials: Record<string, boolean> = { carton: true };
  pay = 'Sin pago';
  photo = '';
  photoName = '';
  errores: Record<string, string> = {};
  publishing = false;
  draftNotice = '';
  dismissedSuggestion = '';
  nombre = '';

  // Material marca el campo en rojo cuando hay error de validación.
  readonly qtyMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['qty'] };
  readonly dateMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['date'] };
  readonly addressMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['address'] };
  readonly amountMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['amount'] };

  private suscripcion: Subscription;

  constructor() {
    this.form = this.fb.group({
      qty: ['', [Validators.required, cantidadPositiva]],
      date: [null, [Validators.required, fechaDesdeHoy]],
      slot: [TIME_SLOTS[0], Validators.required],
      address: ['', Validators.required],
      district: ['San Isidro'],
      amount: [''],
      note: ['', Validators.maxLength(NOTE_LIMIT)],
    });
  }

  ngOnInit(): void {
    this.categoriaService.list().subscribe({
      next: (data) => (this.categorias = data),
      error: (err) => console.error('Error cargando categorías', err),
    });
    this.suscripcion = this.perfilService.getPerfilCambio().subscribe((p) => (this.nombre = p.nombreCompleto));
    this.perfilService.actualizarPerfil();
    this.restoreDraft();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  // ---- Campos
  limpiarError(campo: string): void {
    this.errores = { ...this.errores, [campo]: '' };
  }

  /** Deja solo dígitos, punto y coma (cantidad y monto). */
  soloNumero(campo: 'qty' | 'amount', event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.form.get(campo)?.setValue(valor.replace(/[^\d.,]/g, '').slice(0, 8));
    this.limpiarError(campo);
  }

  setQty(n: number): void {
    this.form.get('qty')?.setValue(String(n));
  }

  toggleMat(k: string): void {
    this.materials = this.materials[k] ? {} : { [k]: true };
    this.limpiarError('mats');
  }

  selectPay(o: string): void {
    this.pay = o;
    this.limpiarError('amount');
  }

  onPhoto(event: Event): void {
    readFile(event.target as HTMLInputElement, (name, url) => {
      this.photo = url;
      this.photoName = name;
      this.dismissedSuggestion = '';
    });
  }

  removePhoto(): void {
    this.photo = '';
    this.photoName = '';
  }

  // ---- Valores derivados
  private pickedMats(): string[] {
    return MAT_ORDER.filter((k) => this.materials[k]);
  }

  nota(): string {
    return String(this.form.value.note ?? '');
  }

  noteOver(): boolean {
    return this.nota().length > NOTE_LIMIT;
  }

  previewKg(): string {
    return (this.form.value.qty || '—') + ' kg';
  }
  previewMatLabel(): string {
    const picked = this.pickedMats();
    return picked.length ? picked.map((k) => MATERIALS[k].label).join(', ') : 'Selecciona material';
  }
  previewIcon(): string {
    return this.pickedMats()[0] ?? 'carton';
  }
  previewColor(): string {
    const k = this.pickedMats()[0];
    return k ? MATERIALS[k].color : '#eceee7';
  }
  previewIconFg(): string {
    const k = this.pickedMats()[0];
    return k ? MATERIALS[k].fg : '#a8b2a2';
  }
  previewWindow(): string {
    const fecha = this.form.value.date as Date | null;
    return fecha ? (isoDate(fecha).split('-').reverse().join('/') + ' · ' + (SLOT_LABELS[this.form.value.slot] ?? '')).toUpperCase() : 'SIN HORARIO';
  }
  publishHint(): string {
    return this.pickedMats().length ? 'Visible para los recicladores de tu zona' : 'Elige un material';
  }

  matChips(): { key: string; label: string; active: boolean }[] {
    return MAT_ORDER.map((k) => ({ key: k, label: MATERIALS[k].label, active: !!this.materials[k] }));
  }

  /** Sugerencia local por palabras clave en la nota o el nombre de la foto (no usa IA). */
  sugerencia(): Sugerencia | null {
    const source = normalizeSearch(this.nota() + ' ' + this.photoName);
    if (!source.trim()) return null;
    const origin = this.photoName ? 'foto' : 'nota';
    const rule = SUGGEST_RULES.find((r) => r.keys.some((k) => source.includes(k)) && !this.materials[r.mat] && this.dismissedSuggestion !== r.mat + ':' + origin);
    if (!rule) return null;
    return {
      key: rule.mat + ':' + origin, mat: rule.mat, label: MATERIALS[rule.mat].label,
      confidence: rule.confidence + (this.photoName ? 4 : 0), source: this.photoName ? 'la foto' : 'la nota',
    };
  }

  applySuggestion(s: Sugerencia): void {
    this.materials = { [s.mat]: true };
    this.limpiarError('mats');
  }

  dismissSuggestion(s: Sugerencia): void {
    this.dismissedSuggestion = s.key;
  }

  // ---- Publicar
  /** Valida y publica (POST /publications). */
  publishAd(): void {
    const errores: Record<string, string> = {};
    const v = this.form.value;
    const qty = this.form.get('qty')!;
    const mat = MAT_ORDER.find((k) => this.materials[k]);
    const category = this.categorias.find((c) => matKey(c.nombre) === mat);
    const paid = this.pay !== 'Sin pago';
    const amount = parseFloat(String(v.amount || '').replace(',', '.'));
    if (qty.hasError('required')) errores['qty'] = 'Ingresa la cantidad aproximada en kilos.';
    else if (qty.hasError('noPositiva')) errores['qty'] = 'La cantidad debe ser mayor que cero.';
    if (!mat) errores['mats'] = 'Elige un tipo de material.';
    else if (!category) errores['mats'] = 'Ese material aún no está disponible en el servidor.';
    if (this.form.get('date')!.invalid) errores['date'] = 'Elige una fecha válida desde hoy.';
    if (this.form.get('address')!.invalid || !String(v.address).trim()) errores['address'] = 'Indica la dirección de recojo.';
    if (paid && !(amount > 0)) errores['amount'] = 'Indica el monto del pago.';
    if (this.form.get('note')!.hasError('maxlength')) errores['note'] = 'Error: la observación excede el límite de ' + NOTE_LIMIT + ' caracteres.';
    if (Object.keys(errores).length) {
      this.errores = errores;
      return;
    }
    const coords = DISTRICTS[v.district] ?? DISTRICTS['San Isidro'];
    const publicacion: CrearPublicacionDTO = {
      categoriaMaterialId: category!.id,
      cantidad: parseFloat(String(v.qty).replace(',', '.')),
      unidadMedida: 'kg',
      descripcion: this.nota().trim().slice(0, NOTE_LIMIT),
      direccion: String(v.address).trim(),
      distrito: v.district,
      latitud: coords.lat,
      longitud: coords.lng,
      fechaDisponibilidad: isoDate(v.date),
      franjaHoraria: v.slot,
      montoPago: paid ? amount : null,
      metodoPago: paid ? this.pay.toLowerCase() : null,
    };
    this.publishing = true;
    this.publicacionService.insert(publicacion).subscribe({
      next: () => {
        this.publishing = false;
        this.errores = {};
        this.form.reset({ qty: '', date: null, slot: TIME_SLOTS[0], address: '', district: 'San Isidro', amount: '', note: '' });
        this.materials = { carton: true };
        this.pay = 'Sin pago';
        this.removePhoto();
        this.dismissedSuggestion = '';
        try { localStorage.removeItem(this.draftKey()); } catch { /* sin storage */ }
        this.publicacionService.actualizarLista();
        this.router.navigate(['/app', 'publicaciones']);
      },
      error: (e) => {
        this.publishing = false;
        this.errores = { form: errorMessage(e) };
      },
    });
  }

  // ---- Borrador (solo en este navegador)
  private draftKey(): string {
    return 'qhurinet.draft.' + (this.loginService.getUser()?.id ?? 'x');
  }

  saveDraft(): void {
    const v = this.form.value;
    const draft = {
      m: this.materials, qty: v.qty, date: v.date ? isoDate(v.date) : '', slot: v.slot, address: v.address,
      district: v.district, pay: this.pay, amount: v.amount, note: v.note,
    };
    try {
      localStorage.setItem(this.draftKey(), JSON.stringify(draft));
      this.draftNotice = 'Borrador guardado.';
    } catch {
      this.draftNotice = 'No se pudo guardar el borrador.';
    }
  }

  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(this.draftKey());
      if (!raw) return;
      const d = JSON.parse(raw);
      this.materials = d.m ?? { carton: true };
      this.pay = d.pay ?? 'Sin pago';
      this.form.patchValue({
        qty: d.qty ?? '', date: d.date ? new Date(d.date + 'T00:00:00') : null, slot: d.slot ?? TIME_SLOTS[0],
        address: d.address ?? '', district: d.district ?? 'San Isidro', amount: d.amount ?? '', note: d.note ?? '',
      });
    } catch {
      /* borrador ilegible: se ignora */
    }
  }
}
