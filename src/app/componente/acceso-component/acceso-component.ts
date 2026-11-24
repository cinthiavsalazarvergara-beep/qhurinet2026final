import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ACCOUNT_TYPE_LIST, ACCOUNT_TYPES, AccountType, AuthMode, homeFor } from '../../model/account';
import { AuthRequestDTO, RegistrarUsuarioDTO } from '../../model/usuario';
import { LoginService } from '../../services/login-service';
import { errorMessage } from '../../core/http-error';

/** Correo con dominio (alineado con el backend). */
export function correoValido(control: AbstractControl): ValidationErrors | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(control.value ?? '').trim()) ? null : { correo: true };
}

/** Teléfono peruano de 9 dígitos (acepta +51 y espacios). */
export function telefonoValido(control: AbstractControl): ValidationErrors | null {
  return /^\d{9}$/.test(String(control.value ?? '').replace(/^\+?51/, '').replace(/\D/g, '')) ? null : { telefono: true };
}

/** Nombre y al menos un apellido. */
export function nombreCompleto(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim().split(/\s+/).length >= 2 ? null : { nombre: true };
}

/**
 * Tarjeta de acceso con Angular Material y formulario reactivo. Un solo componente para
 * login y registro: el modo llega por `data: { mode }` de la ruta. El tipo de cuenta solo
 * se pide al registrarse, porque al iniciar sesión el rol lo dicta el servidor.
 */
@Component({
  selector: 'app-acceso-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, MatFormField, MatInput, MatButton, MatProgressSpinner],
  templateUrl: './acceso-component.html',
  styleUrl: './acceso-component.css',
})
export class AccesoComponent implements OnInit {
  fb: FormBuilder = inject(FormBuilder);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);
  loginService: LoginService = inject(LoginService);

  mode: AuthMode = 'login';
  form: FormGroup;
  cuenta: AccountType | '' = '';
  readonly cuentas = ACCOUNT_TYPE_LIST;
  /** Mensajes de validación, visibles después de intentar enviar. */
  errores: Record<string, string> = {};
  errorServidor = '';
  aviso = '';
  cargando = false;

  // Material marca el campo en rojo cuando tiene un mensaje de error.
  readonly nameMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['name'] };
  readonly emailMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['email'] };
  readonly phoneMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['phone'] };
  readonly passwordMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errores['password'] };

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login';
    const registro = this.mode === 'register';
    this.form = this.fb.group({
      name: ['', registro ? [Validators.required, nombreCompleto] : []],
      email: ['', [Validators.required, correoValido]],
      phone: ['', registro ? [Validators.required, telefonoValido] : []],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
    const cuenta = this.route.snapshot.queryParamMap.get('account');
    if (cuenta && cuenta in ACCOUNT_TYPES) this.cuenta = cuenta as AccountType;
    // Aviso pendiente (cuenta creada o sesión vencida).
    this.aviso = this.loginService.aviso;
    this.loginService.aviso = '';
  }

  esRegistro(): boolean {
    return this.mode === 'register';
  }
  encabezado(): string {
    return this.esRegistro() ? 'CREAR CUENTA' : 'INICIAR SESIÓN';
  }
  titulo(): string {
    return this.esRegistro() ? 'Crea tu cuenta' : 'Bienvenido de vuelta';
  }
  subtitulo(): string {
    return this.esRegistro()
      ? 'Conecta con recicladores y generadores de tu zona en menos de un minuto.'
      : 'Ingresa para ver tus recojos, anuncios y mensajes.';
  }
  textoBoton(): string {
    return this.esRegistro() ? 'Crear cuenta' : 'Entrar';
  }

  elegirCuenta(tipo: AccountType): void {
    this.cuenta = tipo;
    this.limpiarError('account');
  }

  limpiarError(campo: string): void {
    this.errores = { ...this.errores, [campo]: '' };
    this.errorServidor = '';
  }

  /** Traduce los errores de los Validators a los mensajes que ve el usuario. */
  private validar(): Record<string, string> {
    const registro = this.esRegistro();
    const errores: Record<string, string> = {};
    if (registro && this.form.get('name')!.invalid) errores['name'] = 'Escribe tu nombre y apellidos.';
    if (this.form.get('email')!.invalid) errores['email'] = 'Ingresa un correo válido, como nombre@dominio.com.';
    if (registro && this.form.get('phone')!.invalid) errores['phone'] = 'El teléfono debe tener 9 dígitos (formato peruano).';
    if (this.form.get('password')!.invalid) {
      errores['password'] = registro ? 'La contraseña debe tener al menos 8 caracteres.' : 'Ingresa tu contraseña (mínimo 8 caracteres).';
    }
    if (registro && !this.cuenta) errores['account'] = 'Elige un tipo de cuenta para continuar.';
    return errores;
  }

  onSubmit(): void {
    if (this.cargando) return;
    const errores = this.validar();
    if (Object.keys(errores).length) {
      this.errores = errores;
      this.form.markAllAsTouched();
      return;
    }
    this.errorServidor = '';
    this.cargando = true;
    if (this.esRegistro()) {
      this.registrar();
    } else {
      this.entrar();
    }
  }

  private entrar(): void {
    const request: AuthRequestDTO = new AuthRequestDTO();
    request.email = String(this.form.value.email).trim().toLowerCase();
    request.password = this.form.value.password;
    this.loginService.login(request).subscribe({
      next: (rol) => {
        this.cargando = false;
        this.router.navigate(['/app', homeFor(rol)]);
      },
      error: (err) => {
        this.cargando = false;
        this.errorServidor = err?.status === 401 ? 'Correo o contraseña incorrectos.' : errorMessage(err);
      },
    });
  }

  private registrar(): void {
    const v = this.form.value;
    const dto: RegistrarUsuarioDTO = {
      nombreCompleto: String(v.name).trim(),
      email: String(v.email).trim().toLowerCase(),
      password: v.password,
      telefono: String(v.phone).replace(/\s/g, ''),
      rolId: ACCOUNT_TYPES[this.cuenta as AccountType].rolId,
    };
    this.loginService.register(dto).subscribe({
      next: () => {
        this.cargando = false;
        this.loginService.aviso = 'Cuenta creada. Te enviamos un enlace para confirmar tu correo; después podrás iniciar sesión.';
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.cargando = false;
        this.errorServidor = errorMessage(err);
      },
    });
  }

  cambiarA(path: 'login' | 'registro'): void {
    this.router.navigate(['/' + path]);
  }
}
