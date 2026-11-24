// DTOs de usuario y autenticación del backend (AuthController).

export class UsuarioDTO {
  id: number;
  nombreCompleto: string;
  email: string;
  rolId: number;
  rolNombre: string;
  estado: string;
}

/** Cuerpo de POST /auth/login. */
export class AuthRequestDTO {
  email: string;
  password: string;
}

/** Respuesta de POST /auth/login: token y usuario. El token también llega en el header Authorization. */
export class AuthResponseDTO {
  token: string;
  usuario: UsuarioDTO;
}

/** Cuerpo de POST /auth/register. */
export class RegistrarUsuarioDTO {
  nombreCompleto: string;
  email: string;
  password: string;
  telefono: string;
  rolId: number;
}
