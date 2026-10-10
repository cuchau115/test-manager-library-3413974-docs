# ADR-RL-008 · Se exponen ambas rutas de salud: `GET /health` y `GET /api/v1/health`

- **Estado:** aceptada
- **Deriva de:** la decisión abierta nº 2 de [`../../AGENTS.md`](../../AGENTS.md) §11 y de
  [`../../spec-python/api-contract.md`](../../spec-python/api-contract.md) §1 y §3.1.

## Contexto

El contrato declara la **base `/api/v1`** (§1, tabla de convenciones) y lista los *endpoints* bajo esa
base (§3). Sin embargo, en §3.1 la tabla de autenticación y salud incluye la fila:

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/health` | público | `{ "status": "ok" }` |

Es decir: la base es `/api/v1`, pero la ruta de salud aparece **sin** ese prefijo. La misma
discrepancia se repite en la tabla de convenciones (§1: «Autenticación … salvo `POST /auth/login` y
`GET /health`») y en [`../../spec-python/spec.md`](../../spec-python/spec.md) CA-01.3.

Esto genera una ambigüedad real que hay que resolver antes de implementar `T-01.4` y `T-16.3`: ¿la
ruta pública de salud vive en `/health` (raíz del host) o en `/api/v1/health` (bajo la base), o en
ambas?

## Alternativas

1. **Solo `GET /api/v1/health`.** Descartada: respeta la base `/api/v1` pero rompe la lectura literal
   de §3.1, que lista `GET /health` sin prefijo; los *healthchecks* de infraestructura y los clientes
   que sigan el contrato al pie de la letra fallarían.
2. **Solo `GET /health` (en la raíz del host).** Descartada: contradice la convención «Base
   `/api/v1`» y deja la versión de la API fuera de la ruta, dificultando versionar la salud en el
   futuro.
3. **Redirigir una a la otra (301/302).** Descartada: añade una redirección innecesaria; un
   *healthcheck* debe responder `200` directo, no un `3xx`.
4. **Exponer ambas rutas públicas, cada una devolviendo `{"status":"ok"}`.** **Elegida** (decisión
   confirmada en [`../../AGENTS.md`](../../AGENTS.md) §11).

## Decisión

1. Se exponen **dos rutas públicas** de salud, sin token (CA-01.3):
   - `GET /health` → `{"status":"ok"}`
   - `GET /api/v1/health` → `{"status":"ok"}`
2. Ambas son **públicas** y devuelven el **mismo** cuerpo `{"status":"ok"}` (JSON, `snake_case`).
3. La ruta canónica de versión es `GET /api/v1/health` (coherente con la base `/api/v1`); la ruta
   `GET /health` se mantiene como alias directo para *healthchecks* de infraestructura y clientes que
   siguen literalmente §3.1 del contrato.
4. Se implementan en el *router* del `api` (`routes/web.php` / `routes/api.php` según donde caiga la
   raíz del host); la de `/api/v1/health` convive con el resto de rutas versionadas.

## Consecuencias

- El contrato se satisface **por ambos lados**: no hay que reescribir `api-contract.md` (que se
  implementa sin cambios) ni forzar una interpretación que deje a alguien fuera.
- Los *healthchecks* de `docker compose` (`INFRA-03`) y la verificación de `INFRA-05` pueden apuntar
  a cualquiera de las dos sin ambigüedad.
- Coste mínimo: una ruta alias que reutiliza la misma acción/controlador; el cuerpo es idéntico.
- Cualquier futura ruta de salud versionada (`/api/v2/health`) se añade a la lista sin romper el
  alias no versionado.

## Cómo se verifica

- `curl -s localhost:8000/api/v1/health` → `{"status":"ok"}` (evidencia de `T-01.4`).
- `curl -s localhost:8000/health` → `{"status":"ok"}` (misma respuesta, sin token).
- Ambas responden `200` y son accesibles sin cabecera `Authorization`.
