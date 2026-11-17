import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConsoleStore } from '../../../services/console-store';
import { FocusTrapDirective } from '../../../shared/focus-trap.directive';

/** Modal «Entrega confirmada»: valoración 1–5 (simulada, no se guarda). */
@Component({
  selector: 'app-rate-dialog',
  imports: [FocusTrapDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="position: fixed; inset: 0; background: rgba(22,40,31,0.62); display: flex; align-items: center; justify-content: center; z-index: 60;">
      <div appFocusTrap role="dialog" aria-modal="true" aria-label="Entrega confirmada" (keydown.escape)="store.closeRate()" style="width: 400px; background: #ffffff; border-radius: 16px; padding: 26px;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #6c7a6e;">ENTREGA CONFIRMADA</div>
        <div style="font-size: 17px; font-weight: 600; margin-top: 10px;">{{ store.confirmedTitle() }}</div>
        <div style="font-size: 12.5px; color: #5d6b5f; margin-top: 6px; line-height: 1.55;">{{ store.isGen() ? '¿Cómo fue tu experiencia con ' + store.confirmedPerson() + '?' : 'Entrega registrada con ' + store.confirmedPerson() + '.' }}</div>
        @if (store.isGen()) {
          <div style="display: flex; gap: 8px; margin: 20px 0 4px;">
            @for (s of store.stars(); track s.n) {
              <button type="button" [attr.aria-label]="'Calificar con ' + s.n" (click)="store.setRating(s.n)" style="flex: 1; height: 46px; border-radius: 8px; cursor: pointer; font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-weight: 600;" [style.background]="s.bg" [style.color]="s.fg" [style.border]="'1px solid ' + s.border">{{ s.n }}</button>
            }
          </div>
          <textarea aria-label="Comentario" placeholder="Comentario (opcional)" [value]="store.ratingComment()" (input)="store.onRatingComment($any($event.target).value)" maxlength="240" style="width: 100%; height: 76px; resize: none; border: 1px solid #e2e5dc; background: #f4f5f0; border-radius: 8px; padding: 12px 14px; font-size: 13px; outline: none; margin-top: 14px; color: #16281f; line-height: 1.5;"></textarea>
          @if (store.actionError()) { <div role="alert" style="font-size: 12px; color: #b1573f; margin-top: 8px;">{{ store.actionError() }}</div> }
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button type="button" [disabled]="store.rating() === 0" (click)="store.submitRating()" style="flex: 1; border: none; background: #16281f; color: #ffffff; font-size: 13.5px; font-weight: 600; padding: 12px; border-radius: 8px; cursor: pointer;">Enviar valoración</button>
            <button type="button" (click)="store.closeRate()" style="background: #fff; border: 1px solid #d8dcd2; border-radius: 8px; padding: 12px 18px; font-size: 13px; cursor: pointer;">Después</button>
          </div>
        } @else {
          <div style="font-size: 12.5px; color: #3d4a3f; margin: 14px 0; line-height: 1.55;">Registramos la entrega. El generador podrá valorar tu servicio.</div>
          <button type="button" (click)="store.closeRate()" style="width: 100%; border: none; background: #16281f; color: #ffffff; font-size: 13.5px; font-weight: 600; padding: 12px; border-radius: 8px; cursor: pointer;">Listo</button>
        }
      </div>
    </div>
  `,
})
export class RateDialogComponent {
  readonly store = inject(ConsoleStore);
}
