# Despliegue del front (Vercel) y conexión con el back (AWS EC2)

## Arquitectura

- **Front:** Angular, desplegado en Vercel desde GitHub (`main`).
- **Back:** Spring Boot en EC2, `http://100.61.34.159` (puerto 80).
- **Enlace:** `vercel.json` reenvía `/api/*` al back. El navegador habla solo con el dominio de Vercel, así que no hay CORS ni contenido mixto. El front en producción usa `apiUrl: '/api/v1'`.

## 1. Vercel (una vez)

1. Entrar a vercel.com con la cuenta de GitHub que tenga acceso al repo.
2. **Add New → Project → Import** el repo `cinthiavsalazarvergara-beep/qhurinet2026final`.
   Si no aparece, instalar la app de Vercel en GitHub para ese repo, o hacer fork y desplegar el fork.
3. Vercel lee `vercel.json`: no hace falta cambiar comandos ni directorio de salida.
4. Node.js 22 o superior en la configuración del proyecto.
5. Deploy. Anotar la URL: `https://<proyecto>.vercel.app`.

## 2. Back en EC2 (lo hace el compañero que tiene AWS)

Variables del back (sin valores aquí):

| Variable | Valor |
|---|---|
| `FRONTEND_URL` | `https://<proyecto>.vercel.app` |
| `VERIFICATION_URL` | `https://<proyecto>.vercel.app/verify-email` |
| `DB_PASSWORD`, `DB_USER` | credenciales de PostgreSQL |
| `JWT_SECRET` | secreto JWT |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | clasificación con Gemini |
| `OSRM_URL` | servidor OSRM (por defecto `https://router.project-osrm.org`) |
| `MAIL_MODE`, `SMTP_*` | `log` para pruebas, o SMTP real |

Después de cambiar variables, reiniciar el back. Confirmar que `http://100.61.34.159/swagger-ui/index.html` carga desde fuera de la red de AWS.

## 3. Comprobación

Desde el sitio de Vercel:

- [ ] Login con una cuenta de prueba (`/login`).
- [ ] Publicar un anuncio y escribir una nota (sugerencia de Gemini).
- [ ] Mapa: agregar dos puntos de reciclaje y "Optimizar ruta" (muestra km y minutos de OSRM).
- [ ] Registro: el correo de verificación debe apuntar a la URL de Vercel.

## Pendientes conocidos

- `100.61.34.159` está en el rango `100.64.0.0/10` (CGNAT). Confirmar que es una IP pública accesible desde internet. Si no lo es, Vercel no podrá llegar al back.
- El destino del *rewrite* es HTTP. Si Vercel no lo acepta, poner un dominio con HTTPS delante del back y cambiar el destino en `vercel.json`.
