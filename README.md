# QhuriNet · Front (Angular 22 + Angular Material)

Consola web para generadores y recicladores. Conectada al back Spring Boot (`/api/v1`) con login JWT.

```bash
npm ci
npm start        # http://localhost:4200  (API: environment.development.ts → http://localhost:8088/api/v1)
npm test         # 99 pruebas, sin red
npm run build    # usa environment.ts (apiUrl: /api/v1)
```

Documentación de la entrega: [`docs/INTEGRACION.md`](docs/INTEGRACION.md) (seguridad, endpoints, pruebas, pendientes).
