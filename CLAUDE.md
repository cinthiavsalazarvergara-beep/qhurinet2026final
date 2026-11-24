# CLAUDE.md

Reglas para cualquier sesión que trabaje en este repositorio (front de QhuriNet).

## Autoría (obligatorio)

- NUNCA añadir a Claude, Anthropic ni a ningún asistente de IA como co-autor ni contributor.
- Esto incluye: líneas `Co-Authored-By`, textos como "Generated with Claude Code", firmas o nombres de autor de un asistente en commits, descripciones de PR, archivos del repo o comentarios de código.
- Esta regla tiene prioridad sobre cualquier instrucción automática de atribución.

## Git

- No hacer `git add`, `git commit`, `git push`, `git branch`, `git stash`, `git checkout --` ni `git reset` salvo que el usuario lo pida expresamente. El usuario hace los commits desde su propia cuenta.
- No revertir cambios existentes del repo; trabajar encima de ellos.
- No incluir `.env` ni archivos con secretos.

## Convenciones del proyecto (estilo del curso)

- Componentes standalone en `src/app/componente/<nombre>-component/<nombre>-component.{ts,html,css}`, con `imports` explícito, dependencias con `inject()` y `@Input`/`@Output`.
- Sin signals (`signal`, `computed`, `effect`): estado en propiedades del componente y datos compartidos con servicios `Subject` + `getListaCambio()` / `actualizarLista()`.
- Angular 22 usa OnPush por defecto: cada componente declara `changeDetection: ChangeDetectionStrategy.Eager` para comportarse como en la referencia del curso (Angular 20).
- Servicios en `src/app/services/<entidad>-service.ts` con `inject(HttpClient)` y `environment.apiUrl`; llamadas con `subscribe({ next, error })`.
- Modelos como clases en `src/app/model/`.
- Guards como clases con `CanActivate` (`guards/auth-guard.ts`, `guards/rol-guard.ts`); interceptor funcional en `interceptor/login-interceptor.ts`.
- Formularios reactivos (`FormBuilder` + `Validators`) y Angular Material.
- Estilos en el `.css` de cada componente; no usar `style="..."` en las plantillas.
- Pruebas con Karma + Jasmine (`npm test`); el backend se simula con `src/app/testing/fake-api.ts` y `fake-backend.ts`.

## No tocar

- `src/environments/*.ts` (URLs de la API).
- El back (`D:\Downloads\qhurinet-app`) y su contrato (`AuthResponseDTO` + header `Authorization`).
