import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConsoleStore } from '../../services/console-store';
import { MonthSummaryComponent } from '../month-summary/month-summary.component';
import { DeliveryTableComponent } from '../delivery-table/delivery-table.component';

/** Pantalla Recojos del reciclador: tabla de entregas + resumen del mes. */
@Component({
  selector: 'app-pickups',
  imports: [DeliveryTableComponent, MonthSummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pickups.component.html',
  styleUrl: './pickups.component.css',
})
export class PickupsComponent {
  readonly store = inject(ConsoleStore);
}
