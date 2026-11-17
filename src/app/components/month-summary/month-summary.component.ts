import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ConsoleStore } from '../../services/console-store';

/** Resumen del mes con datos reales del backend (reemplaza las tarjetas de cifras fijas). */
@Component({
  selector: 'app-month-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <div style="background: #ffffff; border: 1px solid #e2e5dc; border-radius: 14px; padding: 20px;">
        <div class="lbl">RESUMEN DEL MES</div>
        @if (store.summary(); as s) {
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
            <div><div class="num">{{ s.kg }}</div><div class="cap">{{ kgLabel() }}</div></div>
            <div><div class="num">{{ s.total }}</div><div class="cap">{{ countLabel() }}</div></div>
            <div><div class="num">{{ s.rating }}</div><div class="cap">valoración</div></div>
            <div><div class="num">{{ s.compliance }}</div><div class="cap">cumplimiento</div></div>
          </div>
        } @else {
          <div role="status" class="cap" style="margin-top: 16px;">Cargando resumen…</div>
        }
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e5dc; border-radius: 14px; padding: 20px;">
        <div class="lbl">MATERIALES DEL MES</div>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
          @for (m of store.materialsReport(); track m.label) {
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px;"><div>{{ m.label }}</div><div style="font-family: 'IBM Plex Mono', monospace;">{{ m.kg }}</div></div>
              <div style="height: 6px; background: #eceee7; border-radius: 3px; margin-top: 6px; overflow: hidden;"><div style="height: 100%;" [style.background]="m.color" [style.width.%]="m.pct"></div></div>
            </div>
          } @empty { <div class="cap">Aún no hay recolecciones este mes.</div> }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lbl { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.06em; color: #6c7a6e; }
    .num { font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 600; }
    .cap { font-size: 11px; color: #5d6b5f; margin-top: 3px; }
  `],
})
export class MonthSummaryComponent {
  readonly store = inject(ConsoleStore);
  readonly kgLabel = input('kg recuperados');
  readonly countLabel = input('recojos');
}
