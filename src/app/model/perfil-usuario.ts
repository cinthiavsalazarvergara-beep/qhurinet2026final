import { CategoriaMaterialDTO } from './categoria-material';

export class MetodoPagoUsuarioDTO {
  id?: number | null;
  tipo: string;
  dato: string | null;
  predeterminado: boolean;
}

export class PerfilUsuarioDTO {
  id: number;
  nombreCompleto: string;
  email: string;
  telefono: string;
  fotoPerfilUrl: string | null;
  descripcion: string | null;
  metodoPagoPreferido: string | null;
  enLinea: boolean;
  calificacionPromedio: number | null;
  estado: string;
  rolId: number;
  rolNombre: string;
  materiales: CategoriaMaterialDTO[];
  metodosPago: MetodoPagoUsuarioDTO[];
  verificado: boolean;
}

export class ActualizarPerfilDTO {
  nombreCompleto: string;
  telefono: string;
  descripcion: string;
  materialesIds: number[];
}

export class ReputacionDTO {
  id: number;
  nombreCompleto: string;
  calificacionPromedio: number | null;
  totalEntregas: number | null;
  verificado: boolean | null;
}
