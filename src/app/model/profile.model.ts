// Perfil, documentos de verificación y métodos de pago (datos del backend).

export interface Profile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  mats: string[];
  photo: string;
}

export const PROFILE_EMPTY: Profile = { name: '', email: '', phone: '', bio: '', mats: [], photo: '' };

export interface VerificationDoc {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly state: string;
  readonly date: string;
}

export const DOC_TYPES = ['DNI', 'RUC', 'Otro'] as const;

export interface PayKindInfo {
  readonly label: string;
  readonly short: string;
  readonly bg: string;
  readonly fg: string;
  readonly field: string;
  readonly placeholder: string;
}

export const PAY_KINDS: Record<string, PayKindInfo> = {
  yape: { label: 'Yape', short: 'YAPE', bg: '#742284', fg: '#ffffff', field: 'Número de celular', placeholder: '+51 9xx xxx xxx' },
  plin: { label: 'Plin', short: 'PLIN', bg: '#0f9d9e', fg: '#ffffff', field: 'Número de celular', placeholder: '+51 9xx xxx xxx' },
  tarjeta: { label: 'Tarjeta', short: 'VISA', bg: '#1a1f71', fg: '#ffffff', field: 'Últimos 4 dígitos', placeholder: '4821' },
  transferencia: { label: 'Transferencia', short: 'CCI', bg: '#3d4a3f', fg: '#ffffff', field: 'CCI o número de cuenta', placeholder: '002-123-456789012345-67' },
  efectivo: { label: 'Efectivo', short: 'EFEC.', bg: '#4c7a2f', fg: '#ffffff', field: '', placeholder: '' },
};

export interface PayMethod {
  readonly id: string;
  readonly kind: string;
  readonly detail: string;
}

