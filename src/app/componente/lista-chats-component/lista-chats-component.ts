import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Thread } from '../../model/chat';

/** Columna de conversaciones (un hilo por solicitud de recolección). */
@Component({
  selector: 'app-lista-chats-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './lista-chats-component.html',
  styleUrl: './lista-chats-component.css',
})
export class ListaChatsComponent {
  @Input() hilos: Thread[] = [];
  @Input() activo = '';
  @Output() seleccionar = new EventEmitter<string>();
}
