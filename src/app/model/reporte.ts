// Reportes del mes e historial (ReporteController, END-41 a END-44).

export class ResumenReporteDTO {
  kgTotales: number;
  totalRecojos: number;
  calificacionPromedio: number | null;
  cumplimiento: number | null;
}

export class ReporteMaterialDTO {
  material: string;
  kilos: number;
  recolecciones: number;
  cantidadTotal: number;
  unidadMedida: string;
}

export class HistorialDTO {
  fecha: string;
  material: string;
  cantidad: number;
  contraparte: string;
  calificacionRecolector: number | null;
  estado: string;
  montoPago: number | null;
  solicitudId: number | null;
  unidadMedida: string | null;
}

/** Resumen del mes ya formateado para la vista. */
export class ResumenMes {
  kg: string;
  total: string;
  rating: string;
  compliance: string;
}

/** Barra de «Materiales del mes». */
export class MaterialMes {
  label: string;
  kg: string;
  pct: number;
  color: string;
}

/** Fila de la tabla «Historial de actividad». */
export class Historial {
  type: string;
  material: string;
  party: string;
  date: string;
  rating: string;
}
