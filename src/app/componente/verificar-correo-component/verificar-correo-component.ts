import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoginService } from '../../services/login-service';
import { errorMessage } from '../../core/http-error';

/** Destino del enlace del correo (`/verify-email?token=...`): activa la cuenta (END-04). */
@Component({
  selector: 'app-verificar-correo-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink],
  templateUrl: './verificar-correo-component.html',
  styleUrl: './verificar-correo-component.css',
})
export class VerificarCorreoComponent implements OnInit {
  loginService: LoginService = inject(LoginService);
  route: ActivatedRoute = inject(ActivatedRoute);

  estado: 'loading' | 'ok' | 'error' = 'loading';
  mensaje = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado = 'error';
      this.mensaje = 'El enlace no incluye el token de confirmación.';
      return;
    }
    this.loginService.verifyEmail(token).subscribe({
      next: () => (this.estado = 'ok'),
      error: (e) => {
        this.estado = 'error';
        this.mensaje = errorMessage(e);
      },
    });
  }
}
