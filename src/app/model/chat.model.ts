// Hilos de chat. Cada hilo es una solicitud de recolección del backend (id «t{solicitudId}»).

export interface Thread {
  readonly id: string;
  readonly requestId: number;
  readonly name: string;
  readonly initials: string;
  readonly time: string;
  readonly preview: string;
  readonly tag: string;
}

export interface Message {
  readonly from: 'me' | 'them';
  readonly text: string;
  readonly time: string;
}
