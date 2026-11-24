import { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Routes } from '@angular/router';
import { loginInterceptor } from '../interceptor/login-interceptor';
import { LoginService } from '../services/login-service';
import { FakeApi } from './fake-api';
import { fakeBackend } from './fake-backend';

/** Proveedores comunes de las pruebas: router y HttpClient con la FakeApi en lugar de la red. */
export function testProviders(api: FakeApi, routes: Routes = []): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loginInterceptor, fakeBackend(api)])),
  ];
}

/** ActivatedRoute simulado con query params (deep links) y datos de la ruta. */
export function routeWith(query: Record<string, string> = {}, data: Record<string, unknown> = {}): Provider {
  return {
    provide: ActivatedRoute,
    useValue: { snapshot: { queryParamMap: convertToParamMap(query), data }, firstChild: null },
  };
}

/** Inicia sesión contra la FakeApi (rec@… = reciclador, gen@… = generador). */
export function login(email: 'rec@qhurinet.pe' | 'gen@qhurinet.pe'): void {
  TestBed.inject(LoginService).login({ email, password: 'Secreta123' }).subscribe();
}
