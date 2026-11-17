import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

/** Destino del enlace del correo (`/verify-email?token=...`): activa la cuenta (END-04). */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main style="max-width: 440px; margin: 12vh auto; padding: 32px; background: #fff; border: 1px solid #e2e5dc; border-radius: 14px; text-align: center;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">Confirmación de correo</h1>
      @switch (state()) {
        @case ('loading') { <p role="status">Confirmando tu cuenta…</p> }
        @case ('ok') { <p role="status">¡Listo! Tu cuenta quedó activa.</p><a routerLink="/login" class="flow-button flow-primary" style="display:inline-block;padding:10px 18px;text-decoration:none;">Iniciar sesión</a> }
        @default { <p role="alert" style="color: #b1573f;">{{ message() }}</p><a routerLink="/login">Volver al acceso</a> }
      }
    </main>
  `,
})
export class VerifyEmailComponent {
  private readonly auth = inject(AuthService);
  readonly state = signal<'loading' | 'ok' | 'error'>('loading');
  readonly message = signal('');

  constructor() {
    const token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
    if (!token) { this.state.set('error'); this.message.set('El enlace no incluye el token de confirmación.'); return; }
    this.auth.verifyEmail(token).subscribe({
      next: () => this.state.set('ok'),
      error: (e: Error) => { this.state.set('error'); this.message.set(e.message); },
    });
  }
}
