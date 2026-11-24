# QhuriNet · Integración front ↔ back (entrega 75 %)

## 1. Cómo correrlo

| Parte | Comando | Notas |
|---|---|---|
| Back (Spring Boot, :8088) | `./mvnw spring-boot:run` (o `docker compose up`) | Copiar `.env.example` → `.env`. Con `MAIL_MODE=log` el token de verificación del registro sale en `logs/api.log`. `FRONTEND_URL` ya apunta a `http://localhost:4200` (CORS). |
| Front (Angular 22, :4200) | `npm ci && npm start` | Usa `src/environments/environment.development.ts` → `apiUrl: http://localhost:8088/api/v1`. |
| Build de producción | `npm run build` | Reemplaza por `environment.ts` → `apiUrl: /api/v1` (misma URL de origen detrás del proxy). Cambiarlo ahí, nunca en el código. |
| Tests | `npm test` | 127 pruebas (Karma + Jasmine en Chrome/Edge headless). Sin red: el backend se simula con `src/app/testing/fake-api.ts` + `fake-backend.ts`. |

Flujo de prueba manual: registrar un generador y un reciclador → copiar cada token de `logs/api.log` → abrir `http://localhost:4200/verify-email?token=…` → iniciar sesión.

## 2. Seguridad implementada en el front

- **Login real con JWT** (`POST /auth/login`). El token se toma del header `Authorization` de la respuesta (o del cuerpo `AuthResponseDTO` si el navegador no expone el header) y se guarda en `localStorage` junto con el rol y el usuario; la sesión solo cuenta si el `exp` del JWT sigue vigente.
- **Interceptor** (`interceptor/login-interceptor.ts`): agrega `Authorization: Bearer` solo a URLs de la API; ante un `401` cierra sesión y manda a `/login` (excepto en `/auth/*`, donde un 401 son credenciales malas).
- **Guard de autenticación** (`AuthGuard`, `guards/auth-guard.ts`) en `/app` y **guard por rol** (`RolGuard`, `guards/rol-guard.ts`, lee `data.rol` de la ruta) en cada pantalla: Mapa y Recojos → reciclador; Publicar y Publicaciones → generador. Entrar a una pantalla ajena redirige a la propia.
- **El rol lo dicta el servidor**, no el usuario: se quitó el selector de tipo de cuenta del login y el botón que cambiaba de rol. El tipo de cuenta solo se elige al registrarse (`rolId` 1 = generador, 2 = recolector, según `data.sql`).
- **URL de la API en `environment`** (`environment.apiUrl`, usada por cada servicio `services/*-service.ts`).
- Al cerrar sesión o entrar con otra cuenta se borran las claves de la sesión y la consola reinicia la ruta y la búsqueda (`RutaService.reset()`), para no mostrar datos del usuario anterior.
- La autorización real sigue siendo la del back (`@PreAuthorize`/`SecurityConfig`); los guards del front son solo UX.
- Validación en cliente alineada con la del back (correo, teléfono de 9 dígitos, contraseña ≥ 8, franja `manana|tarde|noche`, CCI de 20 dígitos, etc.).

## 3. Defectos corregidos

| Defecto | Causa | Corrección |
|---|---|---|
| Lo reclamado en el mapa no aparecía en Recojos | `claim()` solo marcaba un booleano; Recojos leía una lista fija | `claim()` hace `POST /collection-requests`, recarga los recojos y el nuevo aparece como **Creada** |
| Pestañas Activos / Completados / Cancelados no filtraban | Eran `div` sin evento y los conteos estaban fijos | Son `button role="tab"` que filtran por estado (`deliveryTab`), con conteos reales y estado vacío |
| Perfil y chat del generador mostraban datos de reciclador | Perfil por defecto y lista de hilos fijos para ambos roles; panel "Contraparte" con 4.8/62 fijos | Perfil de `GET /users/me`; hilos = solicitudes reales del usuario; contraparte con `GET /users/{id}/reputation` |

## 4. Pantallas ↔ endpoints conectados

| Área | Endpoints (END) usados |
|---|---|
| Acceso | `POST /auth/register` (01), `POST /auth/login` (02), `POST /auth/verify-email` (04) |
| Perfil | `GET/PUT /users/me`, `POST /users/me/avatar`, `PATCH /users/me/availability`, `PATCH /users/me/payment-method`, `GET/POST /users/me/documents`, `GET /users/{id}/reputation` (12) |
| Mapa (reciclador) | `GET /publications`, `GET /publications/{id}`, `GET /recycling-points`, `GET /material-categories`, `POST /collection-requests` |
| Recojos (reciclador) | `GET /collection-requests`, `PATCH …/coordinate · reschedule · cancel · priority · start`, `POST …/validate-qr`, `POST …/confirm`, `GET …/tracking` |
| Publicar / Publicaciones (generador) | `POST /publications`, `GET /publications/mine`, `PATCH /publications/{id}/cancel`, `GET /collection-requests/{id}`, `GET …/qr`, `POST …/rating`, `GET …/tracking` |
| Chat | `GET/POST /collection-requests/{id}/messages` |
| Notificaciones | `GET /notifications`, `PATCH …/{id}/read`, `PATCH …/read-all` |
| Soporte | `GET /faqs`, `GET/POST /support-tickets`, `POST /support-tickets/{id}/evidence` |
| Reportes / historial | `GET /reports/summary`, `GET /reports/materials`, `GET /history`, `GET /reports/export` (csv/pdf) |

**Pendiente / fuera de este corte** (no inventado, quedó sin conectar):
- Login con Google/Facebook (`/auth/oauth2/*`): requiere configurar el cliente OAuth; los botones quedaron deshabilitados.
- Rutas guardadas (`/routes`): el back solo guarda rutas de *puntos de reciclaje*, mientras la UI mezcla anuncios y puntos; las rutas guardadas siguen en memoria.
- Clasificación de material por IA desde la foto y edición de publicaciones (`PUT /publications/{id}`).
- El mapa sigue siendo el lienzo dibujado: los anuncios/puntos reales se proyectan desde su latitud/longitud, no hay mapa de calles.

## 5. Pruebas

- 15 archivos, **127 pruebas** (Karma + Jasmine): login, guards, interceptor, rutas con navegación real, formulario de acceso y cada pantalla (mapa, recojos, publicaciones, publicar, chats, perfil, soporte, cabecera), además del cálculo local de la ruta.
- Se mantienen las existentes adaptadas al backend real y se añadieron pruebas de: JWT y expiración, interceptor (Bearer / 401), guard por rol, los tres defectos, errores del servidor (409/401), flujo coordinar → iniciar → validar QR → completar, valoración del generador.
- Cambios de comportamiento que obligaron a reescribir pruebas (no se borró cobertura): el login ya no es simulado; los estados salen del backend (`Reprogramado` no existe: reprogramar deja la solicitud `Coordinada`); las franjas son `manana/tarde/noche`; una publicación = un solo material; el código QR ya no se muestra de muestra.
- **No se probó contra el back en ejecución** (ver README de entrega): el contrato se verificó leyendo controladores/DTOs.

## 6. Evidencias que debe subir el equipo (no se pueden generar desde aquí)

- GitHub: ramas/PR de este trabajo, commits con mensajes por HU, captura de `npm test` en verde.
- Trello/Jira: tablero con las HU, columnas y capturas de las movidas a *Hecho*.
- Capturas de pantalla: login con JWT (pestaña Red del navegador mostrando `Authorization: Bearer`), un 403/redirect del guard por rol, las pestañas filtrando.

## 7. Fidelidad visual con el prototipo

Se comparó el front contra el prototipo (renderizando ambos en Chromium con datos simulados del servidor). Diferencias que se mantienen **a propósito**:

- **Login sin «Tipo de cuenta»:** el rol lo dicta el servidor; el selector solo existe en el registro.
- **Sin «Meta mensual 200 kg»:** el back no tiene metas; se quitó en vez de mostrar un valor inventado.
- **Chat:** la lista muestra el estado de la entrega en vez de la vista previa del último mensaje (el back no la expone).
- **Botones Google/Facebook:** se ven igual pero están deshabilitados hasta configurar OAuth.
- «Visible para 14 recicladores cerca» se cambió por un texto sin cifra inventada.

Los campos de Angular Material del acceso y de Publicar usan un *skin* plano (`.flat-field`, `.flat-button` en `styles.css`) para verse como los campos del prototipo.
