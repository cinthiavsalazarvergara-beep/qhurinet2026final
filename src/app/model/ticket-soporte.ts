export class FaqDTO {
  pregunta: string;
  respuesta: string;
}

export class TicketSoporteDTO {
  id: number;
  categoria: string;
  estado: string;
  asunto: string;
  descripcion: string;
  evidenciaUrl: string | null;
  fechaCreacion: string;
}

export class CrearTicketDTO {
  categoria: string;
  asunto: string;
  descripcion: string;
  solicitudId?: number | null;
}
