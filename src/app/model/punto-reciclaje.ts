import { CategoriaMaterialDTO } from './categoria-material';

export class PuntoReciclajeDTO {
  id: number;
  nombre: string;
  tipo: string;
  direccion: string;
  distrito: string;
  latitud: number;
  longitud: number;
  horarioAtencion: string;
  calificacionPromedio: number;
  materiales: CategoriaMaterialDTO[];
}
