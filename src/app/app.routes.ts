import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';
import { RolGuard } from './guards/rol-guard';
import { AccesoLayoutComponent } from './componente/acceso-layout-component/acceso-layout-component';
import { AccesoComponent } from './componente/acceso-component/acceso-component';
import { VerificarCorreoComponent } from './componente/verificar-correo-component/verificar-correo-component';
import { ConsolaComponent } from './componente/consola-component/consola-component';

// AuthGuard protege toda la consola (/app); RolGuard deja pasar solo al rol de `data.rol`.
// Las pantallas de /app se cargan de forma diferida (loadComponent): cargarlas todas al
// inicio supera el presupuesto de 1 MB del bundle inicial definido en angular.json.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: '',
    component: AccesoLayoutComponent,
    children: [
      { path: 'login', component: AccesoComponent, data: { mode: 'login' }, title: 'Iniciar sesión · QhuriNet' },
      { path: 'registro', component: AccesoComponent, data: { mode: 'register' }, title: 'Crear cuenta · QhuriNet' },
    ],
  },
  { path: 'verify-email', component: VerificarCorreoComponent, title: 'Confirmar correo · QhuriNet' },
  {
    path: 'app',
    component: ConsolaComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'mapa', pathMatch: 'full' },
      { path: 'mapa', loadComponent: () => import('./componente/mapa-component/mapa-component').then((m) => m.MapaComponent), canActivate: [RolGuard], data: { tab: 'mapa', rol: 'reciclador' }, title: 'Mapa · QhuriNet' },
      { path: 'recojos', loadComponent: () => import('./componente/recojos-component/recojos-component').then((m) => m.RecojosComponent), canActivate: [RolGuard], data: { tab: 'recojos', rol: 'reciclador' }, title: 'Recojos · QhuriNet' },
      { path: 'publicar', loadComponent: () => import('./componente/publicar-component/publicar-component').then((m) => m.PublicarComponent), canActivate: [RolGuard], data: { tab: 'publicar', rol: 'generador' }, title: 'Publicar · QhuriNet' },
      { path: 'publicaciones', loadComponent: () => import('./componente/publicaciones-component/publicaciones-component').then((m) => m.PublicacionesComponent), canActivate: [RolGuard], data: { tab: 'publicaciones', rol: 'generador' }, title: 'Anuncios · QhuriNet' },
      { path: 'chats', loadComponent: () => import('./componente/chats-component/chats-component').then((m) => m.ChatsComponent), data: { tab: 'chats' }, title: 'Chats · QhuriNet' },
      { path: 'perfil', loadComponent: () => import('./componente/perfil-component/perfil-component').then((m) => m.PerfilComponent), data: { tab: 'perfil' }, title: 'Perfil · QhuriNet' },
      { path: 'soporte', loadComponent: () => import('./componente/soporte-component/soporte-component').then((m) => m.SoporteComponent), data: { tab: 'soporte' }, title: 'Soporte · QhuriNet' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
