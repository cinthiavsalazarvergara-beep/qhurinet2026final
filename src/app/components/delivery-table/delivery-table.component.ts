import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ConsoleStore, DeliveryRow } from '../../services/console-store';
import { DeliveryTab, stateTab } from '../../core/mappers';

/**
 * Tabla de entregas compartida por Recojos (reciclador) y Anuncios (generador).
 * El modo cambia encabezados y el ícono central (QR en recojos, Ver anuncio en
 * anuncios), igual que en el prototipo.
 */
@Component({
  selector: 'app-delivery-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delivery-table.component.html',
  styleUrl: './delivery-table.component.css',
})
export class DeliveryTableComponent {
  readonly store = inject(ConsoleStore);
  readonly rows = input.required<DeliveryRow[]>();
  readonly mode = input.required<'recojos' | 'anuncios'>();

  /** Pestañas Activos / Completados / Cancelados con su contador real. */
  readonly tabs = computed(() => {
    const all = this.rows();
    const count = (t: DeliveryTab) => all.filter((r) => stateTab(r.state) === t).length;
    return [
      { key: 'activos' as DeliveryTab, label: 'Activos', count: count('activos') },
      { key: 'completados' as DeliveryTab, label: 'Completados', count: count('completados') },
      { key: 'cancelados' as DeliveryTab, label: 'Cancelados', count: count('cancelados') },
    ];
  });
  /** Filas de la pestaña elegida. */
  readonly visibleRows = computed(() => this.rows().filter((r) => stateTab(r.state) === this.store.deliveryTab()));
  readonly emptyText = computed(() => ({ activos: 'No tienes entregas activas.', completados: 'Aún no hay entregas completadas.', cancelados: 'No hay entregas canceladas.' }[this.store.deliveryTab()]));
}
