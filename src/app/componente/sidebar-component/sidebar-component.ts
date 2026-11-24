import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { GENERADOR_TABS, RECICLADOR_TABS, Tab, TAB_LABELS } from '../../model/account';
import { LoginService } from '../../services/login-service';
import { PerfilService } from '../../services/perfil-service';
import { IconoComponent } from '../icono-component/icono-component';
import { LogoComponent } from '../logo-component/logo-component';

/** Barra lateral de 88 px: marca, pestañas del rol, MODO y avatar. */
@Component({
  selector: 'app-sidebar-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, RouterLinkActive, IconoComponent, LogoComponent],
  templateUrl: './sidebar-component.html',
  styleUrl: './sidebar-component.css',
})
export class SidebarComponent implements OnInit, OnDestroy {
  loginService: LoginService = inject(LoginService);
  perfilService: PerfilService = inject(PerfilService);

  items: { tab: Tab; label: string }[] = [];
  modo = 'REC';
  foto = '';
  inicial = '?';
  private suscripcion: Subscription;

  ngOnInit(): void {
    const esGenerador = this.loginService.getRole() === 'generador';
    this.modo = esGenerador ? 'GEN' : 'REC';
    this.items = (esGenerador ? GENERADOR_TABS : RECICLADOR_TABS).map((t) => ({ tab: t, label: TAB_LABELS[t] }));
    this.suscripcion = this.perfilService.getPerfilCambio().subscribe((p) => {
      this.foto = p.fotoPerfilUrl ?? '';
      this.inicial = p.nombreCompleto.trim()[0]?.toUpperCase() || '?';
    });
    this.perfilService.actualizarPerfil();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }
}
