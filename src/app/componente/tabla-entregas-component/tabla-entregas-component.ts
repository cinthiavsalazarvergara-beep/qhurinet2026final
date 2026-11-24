import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Delivery, DeliveryRow } from '../../model/delivery';
import { DeliveryTab, stateTab } from '../../core/mappers';
import { toRow } from '../../core/entregas';

/** Acción pedida desde una fila de la tabla. */
export class AccionFila {
  tipo: 'chat' | 'valorar' | 'escanear' | 'coordinar' | 'iniciar' | 'seguir' | 'reprogramar' | 'cancelar' | 'prioridad';
  id: string;
}

/**
 * Tabla de entregas compartida por Recojos (reciclador) y Anuncios (generador).
 * El modo cambia encabezados y el ícono central (QR en recojos, Ver anuncio en anuncios).
 * La pantalla que la usa decide qué hacer con cada acción (@Output accion).
 */
@Component({
  selector: 'app-tabla-entregas-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './tabla-entregas-component.html',
  styleUrl: './tabla-entregas-component.css',
})
export class TablaEntregasComponent implements OnChanges {
  @Input() filas: Delivery[] = [];
  @Input() modo: 'recojos' | 'anuncios' = 'recojos';
  @Input() pestana: DeliveryTab = 'activos';
  @Output() accion = new EventEmitter<AccionFila>();

  pestanas: { key: DeliveryTab; label: string; count: number }[] = [];
  visibles: DeliveryRow[] = [];
  menuFila: string | null = null;

  ngOnChanges(): void {
    this.actualizarVista();
  }

  /** Cambia la pestaña (Activos / Completados / Cancelados) y cierra el menú abierto. */
  cambiarPestana(tab: DeliveryTab): void {
    this.pestana = tab;
    this.menuFila = null;
    this.actualizarVista();
  }

  toggleMenu(id: string): void {
    this.menuFila = this.menuFila === id ? null : id;
  }

  emitir(tipo: AccionFila['tipo'], id: string): void {
    this.menuFila = null;
    this.accion.emit({ tipo, id });
  }

  textoVacio(): string {
    if (this.pestana === 'completados') return 'Aún no hay entregas completadas.';
    if (this.pestana === 'cancelados') return 'No hay entregas canceladas.';
    return 'No tienes entregas activas.';
  }

  private actualizarVista(): void {
    const count = (t: DeliveryTab) => this.filas.filter((r) => stateTab(r.state) === t).length;
    this.pestanas = [
      { key: 'activos', label: 'Activos', count: count('activos') },
      { key: 'completados', label: 'Completados', count: count('completados') },
      { key: 'cancelados', label: 'Cancelados', count: count('cancelados') },
    ];
    this.visibles = this.filas.filter((r) => stateTab(r.state) === this.pestana).map(toRow);
  }
}
