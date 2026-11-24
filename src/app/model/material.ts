// Catálogo de materiales, espejo de public/images/materials/* y del prototipo.
// Cada material tiene color de chip y color de trazo del ícono (fg). El ícono se
// dibuja con <app-icono-component [nombre]="clave">.

export class Material {
  label: string;
  color: string;
  fg: string;
}

export const MATERIALS: Record<string, Material> = {
  carton: { label: 'Cartón', color: '#e8b53a', fg: '#16281f' },
  papel: { label: 'Papel', color: '#c98f3c', fg: '#16281f' },
  pet: { label: 'PET', color: '#4c7a2f', fg: '#ffffff' },
  vidrio: { label: 'Vidrio', color: '#5b7f9e', fg: '#ffffff' },
  metal: { label: 'Metal', color: '#b1573f', fg: '#ffffff' },
  electronicos: { label: 'Electrónicos', color: '#6b5b95', fg: '#ffffff' },
  organico: { label: 'Orgánico', color: '#7a8f3f', fg: '#ffffff' },
  plastico: { label: 'Plástico', color: '#4c7a2f', fg: '#ffffff' },
};

/** Orden de los chips de material en Publicar. */
export const MAT_ORDER = ['carton', 'pet', 'vidrio', 'metal', 'plastico'];

/** Materiales usados como filtro en el mapa. */
export const MAP_MATERIALS = ['carton', 'pet', 'vidrio', 'metal', 'plastico'];
