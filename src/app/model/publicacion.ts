// DTOs de publicaciones de material (PublicacionMaterialController).

export class PublicacionDTO {
  id: number;
  categoriaMaterialId: number;
  categoriaMaterialNombre: string;
  cantidad: number;
  unidadMedida: string;
  descripcion: string | null;
  estado: string;
  fotoUrl: string | null;
  direccion: string;
  distrito: string;
  latitud: number | null;
  longitud: number | null;
  fechaDisponibilidad: string | null;
  fechaPublicacion: string;
  generadorId: number;
  generadorNombreCompleto: string;
  franjaHoraria: string | null;
  montoPago: number | null;
  metodoPago: string | null;
}

export class CrearPublicacionDTO {
  categoriaMaterialId: number;
  cantidad: number;
  unidadMedida: string;
  descripcion: string;
  direccion: string;
  distrito: string;
  latitud?: number | null;
  longitud?: number | null;
  fechaDisponibilidad: string;
  franjaHoraria: string;
  montoPago?: number | null;
  metodoPago?: string | null;
}

export class MiPublicacionDTO {
  id: number;
  cantidad: number;
  material: string;
  fechaPublicacion: string;
  estado: string;
  reciclador: string | null;
  fechaCoordinada: string | null;
  solicitudId: number | null;
  franjaHoraria: string | null;
  unidadMedida: string | null;
}
