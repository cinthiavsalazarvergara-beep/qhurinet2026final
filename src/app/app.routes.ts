import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './services/auth.guard';
import { AuthLayoutComponent } from './components/auth/auth-layout/auth-layout.component';
import { AuthFormComponent } from './components/auth/auth-form/auth-form.component';
import { VerifyEmailComponent } from './components/auth/verify-email/verify-email.component';
import { ConsoleShellComponent } from './components/console/console-shell/console-shell.component';

// Las pantallas de /app se cargan de forma diferida (loadComponent): el Mapa,
// Recojos, etc. sólo se descargan al navegar a su ruta, aligerando el bundle inicial.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: AuthFormComponent, data: { mode: 'login' }, title: 'Iniciar sesión · QhuriNet' },
      { path: 'registro', component: AuthFormComponent, data: { mode: 'register' }, title: 'Crear cuenta · QhuriNet' },
    ],
  },
  { path: 'verify-email', component: VerifyEmailComponent, title: 'Confirmar correo · QhuriNet' },
  {
    path: 'app',
    component: ConsoleShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'mapa', pathMatch: 'full' },
      { path: 'mapa', canActivate: [roleGuard('reciclador')], loadComponent: () => import('./components/map/map.component').then((m) => m.MapComponent), data: { tab: 'mapa' }, title: 'Mapa · QhuriNet' },
      { path: 'recojos', canActivate: [roleGuard('reciclador')], loadComponent: () => import('./components/pickups/pickups.component').then((m) => m.PickupsComponent), data: { tab: 'recojos' }, title: 'Recojos · QhuriNet' },
      { path: 'publicar', canActivate: [roleGuard('generador')], loadComponent: () => import('./components/publish/publish.component').then((m) => m.PublishComponent), data: { tab: 'publicar' }, title: 'Publicar · QhuriNet' },
      { path: 'publicaciones', canActivate: [roleGuard('generador')], loadComponent: () => import('./components/publications/publications.component').then((m) => m.PublicationsComponent), data: { tab: 'publicaciones' }, title: 'Anuncios · QhuriNet' },
      { path: 'chats', loadComponent: () => import('./components/chats/chats.component').then((m) => m.ChatsComponent), data: { tab: 'chats' }, title: 'Chats · QhuriNet' },
      { path: 'perfil', loadComponent: () => import('./components/profile/profile.component').then((m) => m.ProfileComponent), data: { tab: 'perfil' }, title: 'Perfil · QhuriNet' },
      { path: 'soporte', loadComponent: () => import('./components/support/support.component').then((m) => m.SupportComponent), data: { tab: 'soporte' }, title: 'Soporte · QhuriNet' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
