// Centro de notificaciones (GET /notifications).

export class NotificacionDTO {
  id: number;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
}

/** Notificación tal como se muestra en el panel de la cabecera. */
export class Notificacion {
  id: string;
  apiId: number;
  title: string;
  text: string;
  time: string;
  read: boolean;
}
