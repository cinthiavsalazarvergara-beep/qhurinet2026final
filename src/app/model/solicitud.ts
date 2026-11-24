// DTOs de solicitudes de recolección (SolicitudRecoleccionController).

export class SolicitudDTO {
  id: number;
  publicacionId: number;
  estado: string;
  prioritaria: boolean;
  fechaCoordinada: string | null;
  franjaHoraria: string | null;
}

export class MiSolicitudDTO {
  id: number;
  cantidad: number;
  material: string;
  direccion: string;
  estado: string;
  prioritaria: boolean;
  contraparte: string;
  fechaCoordinada: string | null;
  publicacionId: number | null;
  franjaHoraria: string | null;
  unidadMedida: string | null;
}

export class DetalleSolicitudDTO {
  solicitud: SolicitudDTO;
  generadorId: number;
  recolectorId: number;
  contraparte: string;
  material: string;
  cantidad: number;
  unidadMedida: string;
  direccion: string;
}

export class CodigoQrDTO {
  codigoQr: string;
  qrValidado: boolean;
}

export class SeguimientoDTO {
  solicitudId: number;
  estado: string;
  recolector: string;
  destino: string;
  minutosEstimados: number | null;
  latitudActual: number | null;
  longitudActual: number | null;
}
