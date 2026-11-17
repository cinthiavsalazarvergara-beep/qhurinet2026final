import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConsoleStore } from '../../../services/console-store';
import { FocusTrapDirective } from '../../../shared/focus-trap.directive';

/** Modal «Confirmar entrega» (escáner QR). Sin cámara: valida el código de
 *  muestra. Lo ve solo el reciclador. */
@Component({
  selector: 'app-scanner-dialog',
  imports: [FocusTrapDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.actionDelivery(); as d) {
      <div style="position: fixed; inset: 0; background: rgba(22,40,31,0.62); display: flex; align-items: center; justify-content: center; z-index: 60;">
        <div role="dialog" appFocusTrap aria-modal="true" aria-label="Confirmar entrega" (keydown.escape)="store.closeScanner()" style="max-height: calc(100vh - 32px); overflow-y: auto; width: 420px; background: #ffffff; border-radius: 16px; overflow-x: hidden;">
          <div style="background: #16281f; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #a3d24a;">CONFIRMAR ENTREGA</div>
              <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-top: 5px;">{{ store.scannerTitle() }}</div>
            </div>
            <div (click)="store.closeScanner()" title="Cerrar" style="color: #8fa392; font-size: 20px; cursor: pointer; line-height: 1;">×</div>
          </div>
          <div style="padding: 24px 22px;">
            <div style="font-size: 12.5px; color: #3d4a3f; line-height: 1.55;">Pide al generador el código de entrega (lo ve en su chat de esta recolección) e ingrésalo. Al confirmar se registra la entrega.</div>
            <label style="display: block; font-size: 12px; margin-top: 12px;">Código de entrega<input class="flow-field" aria-label="Código de entrega" [value]="store.manualCode()" (input)="store.onManualCode($any($event.target).value)" (keydown.enter)="store.confirmManual()" placeholder="Código de entrega" maxlength="24" /></label>
            @if (store.formError()) { <div role="alert" style="font-size: 12px; color: #b1573f; margin-top: 10px;">{{ store.formError() }}</div> }
            @if (store.lockedAction()) { <div role="status" style="font-size: 12px; color: #5d6b5f; margin-top: 10px;">Esta entrega ya está {{ d.state }}.</div> }
            <button type="button" class="flow-button" [disabled]="store.lockedAction()" (click)="store.confirmManual()" style="width: 100%; margin-top: 12px;">Confirmar entrega</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ScannerDialogComponent {
  readonly store = inject(ConsoleStore);
}
