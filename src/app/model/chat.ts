// Hilos de chat. Cada hilo es una solicitud de recolección del backend (id «t{solicitudId}»).

export class Thread {
  id: string;
  requestId: number;
  name: string;
  initials: string;
  time: string;
  preview: string;
  tag: string;
}

/** Reputación de la contraparte del hilo abierto (GET /users/{id}/reputation). */
export class Contraparte {
  rating: string;
  deliveries: string;
  verified: string;
}
