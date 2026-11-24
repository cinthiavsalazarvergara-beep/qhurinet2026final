import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RutaService } from '../../services/ruta-service';
import { BusquedaService } from '../../services/busqueda-service';
import { SidebarComponent } from '../sidebar-component/sidebar-component';
import { TopbarComponent } from '../topbar-component/topbar-component';

/** Armazón de la consola (/app): barra lateral, cabecera y la pantalla activa del router. */
@Component({
  selector: 'app-consola-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './consola-component.html',
  styleUrl: './consola-component.css',
})
export class ConsolaComponent implements OnInit {
  rutaService: RutaService = inject(RutaService);
  busquedaService: BusquedaService = inject(BusquedaService);

  ngOnInit(): void {
    // Al entrar con una sesión nueva no deben quedar la ruta ni la búsqueda del usuario anterior.
    this.rutaService.reset();
    this.busquedaService.setTexto('');
  }
}
