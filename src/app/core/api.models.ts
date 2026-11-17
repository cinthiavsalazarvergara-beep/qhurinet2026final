// DTOs del backend (Spring Boot). Solo los campos que el front consume.

export interface UsuarioDTO { id: number; nombreCompleto: string; email: string; rolId: number; rolNombre: string; estado: string; }
export interface AuthResponseDTO { token: string; usuario: UsuarioDTO; }
export interface RegistrarUsuarioDTO { nombreCompleto: string; email: string; password: string; telefono: string; rolId: number; }
export interface CategoriaMaterialDTO { id: number; nombre: string; unidadMedidaDefault: string; }
export interface MetodoPagoUsuarioDTO { id?: number | null; tipo: string; dato: string | null; predeterminado: boolean; }
export interface PerfilUsuarioDTO {
  id: number; nombreCompleto: string; email: string; telefono: string; fotoPerfilUrl: string | null;
  descripcion: string | null; metodoPagoPreferido: string | null; enLinea: boolean;
  calificacionPromedio: number | null; estado: string; rolId: number; rolNombre: string;
  materiales: CategoriaMaterialDTO[]; metodosPago: MetodoPagoUsuarioDTO[]; verificado: boolean;
}
export interface ActualizarPerfilDTO { nombreCompleto: string; telefono: string; descripcion: string; materialesIds: number[]; }
export interface PublicacionDTO {
  id: number; categoriaMaterialId: number; categoriaMaterialNombre: string; cantidad: number; unidadMedida: string;
  descripcion: string | null; estado: string; fotoUrl: string | null; direccion: string; distrito: string;
  latitud: number | null; longitud: number | null; fechaDisponibilidad: string | null; fechaPublicacion: string;
  generadorId: number; generadorNombreCompleto: string; franjaHoraria: string | null; montoPago: number | null; metodoPago: string | null;
}
export interface CrearPublicacionDTO {
  categoriaMaterialId: number; cantidad: number; unidadMedida: string; descripcion: string; direccion: string; distrito: string;
  latitud?: number | null; longitud?: number | null; fechaDisponibilidad: string; franjaHoraria: string; montoPago?: number | null; metodoPago?: string | null;
}
export interface MiPublicacionDTO {
  id: number; cantidad: number; material: string; fechaPublicacion: string; estado: string; reciclador: string | null;
  fechaCoordinada: string | null; solicitudId: number | null; franjaHoraria: string | null; unidadMedida: string | null;
}
export interface MiSolicitudDTO {
  id: number; cantidad: number; material: string; direccion: string; estado: string; prioritaria: boolean;
  contraparte: string; fechaCoordinada: string | null; publicacionId: number | null; franjaHoraria: string | null; unidadMedida: string | null;
}
export interface SolicitudDTO { id: number; publicacionId: number; estado: string; prioritaria: boolean; fechaCoordinada: string | null; franjaHoraria: string | null; }
export interface ReputacionDTO { id: number; nombreCompleto: string; calificacionPromedio: number | null; totalEntregas: number | null; verificado: boolean | null; }
export interface DetalleSolicitudDTO { solicitud: SolicitudDTO; generadorId: number; recolectorId: number; contraparte: string; material: string; cantidad: number; unidadMedida: string; direccion: string; }
export interface MensajeDTO { id: number; contenido: string; fechaEnvio: string; remitenteId: number; }
export interface NotificacionDTO { id: number; mensaje: string; leida: boolean; fechaCreacion: string; }
export interface CodigoQrDTO { codigoQr: string; qrValidado: boolean; }
export interface SeguimientoDTO { solicitudId: number; estado: string; recolector: string; destino: string; minutosEstimados: number | null; latitudActual: number | null; longitudActual: number | null; }
export interface PuntoReciclajeDTO {
  id: number; nombre: string; tipo: string; direccion: string; distrito: string; latitud: number; longitud: number;
  horarioAtencion: string; calificacionPromedio: number; materiales: CategoriaMaterialDTO[];
}
export interface FaqDTO { pregunta: string; respuesta: string; }
export interface TicketSoporteDTO { id: number; categoria: string; estado: string; asunto: string; descripcion: string; evidenciaUrl: string | null; fechaCreacion: string; }
export interface CrearTicketDTO { categoria: string; asunto: string; descripcion: string; solicitudId?: number | null; }
export interface DocumentoVerificacionDTO { id: number; tipo: string; urlArchivo: string; estado: string; fechaSubida: string; }
export interface HistorialDTO { fecha: string; material: string; cantidad: number; contraparte: string; calificacionRecolector: number | null; estado: string; montoPago: number | null; solicitudId: number | null; unidadMedida: string | null; }
export interface ApiError { code?: string; message?: string; }
export interface ResumenReporteDTO { kgTotales: number; totalRecojos: number; calificacionPromedio: number | null; cumplimiento: number | null; }
export interface ReporteMaterialDTO { material: string; kilos: number; recolecciones: number; cantidadTotal: number; unidadMedida: string; }
