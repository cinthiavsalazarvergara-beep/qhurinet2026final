import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { ACCOUNT_TYPE_LIST, AccountType, AuthErrorField, AuthForm, AuthMode, Role } from '../../../model/account.model';
import { AuthService } from '../../../services/auth.service';
import { homeFor } from '../../../services/auth.guard';

/**
 * Tarjeta de acceso con Angular Material (campos, botones). Un solo componente para login y
 * registro: el modo llega por los datos de la ruta. El login es real (JWT); el tipo de cuenta
 * solo se pide al registrarse, porque al iniciar sesión el rol lo dicta el servidor.
 */
@Component({
  selector: 'app-auth-form',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.css',
})
export class AuthFormComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = input<AuthMode>('login');

  readonly form = this.auth.form;
  readonly errors = this.auth.errors;
  readonly loading = this.auth.loading;
  readonly serverError = this.auth.serverError;
  readonly notice = this.auth.notice;

  readonly heading = computed(() => (this.mode() === 'register' ? 'CREAR CUENTA' : 'INICIAR SESIÓN'));
  readonly title = computed(() => (this.mode() === 'register' ? 'Crea tu cuenta' : 'Bienvenido de vuelta'));
  readonly subtitle = computed(() =>
    this.mode() === 'register'
      ? 'Conecta con recicladores y generadores de tu zona en menos de un minuto.'
      : 'Ingresa para ver tus recojos, anuncios y mensajes.',
  );
  readonly buttonLabel = computed(() => (this.mode() === 'register' ? 'Crear cuenta' : 'Entrar'));

  readonly accountCards = computed(() =>
    ACCOUNT_TYPE_LIST.map((a) => ({
      key: a.key, label: a.label, hint: a.hint,
      roleLabel: a.role === 'generador' ? 'GENERADOR' : 'RECICLADOR',
      selected: this.auth.selectedAccount() === a.key,
    })),
  );

  /** Material marca el campo en rojo cuando el servicio de acceso reporta su error. */
  private matcher(field: AuthErrorField): ErrorStateMatcher {
    return { isErrorState: () => !!this.auth.errors()[field] };
  }
  readonly nameMatcher = this.matcher('name');
  readonly emailMatcher = this.matcher('email');
  readonly phoneMatcher = this.matcher('phone');
  readonly passwordMatcher = this.matcher('password');

  constructor() {
    this.auth.preselectAccount(this.route.snapshot.queryParamMap.get('account'));
  }

  selectAccount(type: AccountType): void { this.auth.selectAccount(type); }

  update(key: keyof AuthForm, event: Event): void {
    this.auth.updateField(key, (event.target as HTMLInputElement).value);
  }

  submit(): void {
    if (this.loading()) return;
    if (this.mode() === 'register') {
      this.auth.register().subscribe((ok) => { if (ok) this.router.navigate(['/login']); });
    } else {
      this.auth.login().subscribe((role) => this.enter(role));
    }
  }

  private enter(role: Role | null): void {
    if (!role) return;
    this.router.navigate(['/app', homeFor(role)]);
  }

  switchTo(path: 'login' | 'registro'): void {
    this.auth.clearErrors();
    this.router.navigate(['/' + path]);
  }
}
