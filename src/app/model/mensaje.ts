export class MensajeDTO {
  id: number;
  contenido: string;
  fechaEnvio: string;
  remitenteId: number;
}

/** Mensaje tal como se muestra en la conversación. */
export class Mensaje {
  id: number;
  mio: boolean;
  texto: string;
  hora: string;
}
