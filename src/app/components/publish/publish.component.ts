import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ErrorStateMatcher, provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ConsoleStore } from '../../services/console-store';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

const pad = (n: number) => String(n).padStart(2, '0');

/** Pantalla Publicar del generador: formulario con Angular Material (campos, selects y calendario). */
@Component({
  selector: 'app-publish',
  imports: [SafeHtmlPipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publish.component.html',
  styleUrl: './publish.component.css',
})
export class PublishComponent {
  readonly store = inject(ConsoleStore);
  readonly minDate = new Date();

  // Material marca el campo en rojo cuando el store reporta su error.
  readonly qtyMatcher: ErrorStateMatcher = { isErrorState: () => !!this.store.errQty() };
  readonly dateMatcher: ErrorStateMatcher = { isErrorState: () => !!this.store.errDate() };
  readonly addressMatcher: ErrorStateMatcher = { isErrorState: () => !!this.store.errAddress() };
  readonly amountMatcher: ErrorStateMatcher = { isErrorState: () => !!this.store.errAmount() };

  dateValue(): Date | null {
    const v = this.store.pubDate();
    return v ? new Date(v + 'T00:00:00') : null;
  }

  onDate(d: Date | null): void {
    this.store.setPubDate(d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');
  }
}
