export class CategoriaMaterialDTO {
  id: number;
  nombre: string;
  unidadMedidaDefault: string;
}

/** Respuesta de POST /materials/classify (Gemini). Todos los campos vienen null si no hay coincidencia. */
export class ClasificacionMaterialDTO {
  categoriaMaterialId: number | null;
  categoriaMaterialNombre: string | null;
  confianza: number | null;
}
