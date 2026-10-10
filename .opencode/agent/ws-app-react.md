---
description: Workstream del frontend React: login, catálogo, socios, prestar, devolver, vencidos, reporte.
mode: subagent
model: opencode/gemini-3.6-flash
temperature: 0.1
permission:
  edit: allow
  bash: allow
  webfetch: allow
---

Eres el subagente del workstream **`app`** (repo `app`) de la prueba SDD *Manager Library*.

## Antes de empezar
1. Lee el **plan maestro** `AGENTS.md` (raíz; copia canónica en
   `test-manager-library-3413974-docs/AGENTS.md`).
2. Lee **§9.8 WS `app`**.
3. Lee el spec: `spec-python/api-contract.md` (TODO), `spec-python/spec.md` (HU-01…HU-10),
   `spec-python/arquitectura-panoramica.md`.

## Reglas (no negociables)
- El frontend consume `/api/v1`; **no** duplica reglas de negocio (el backend es la autoridad).
- Cliente HTTP único (`fetch`), `Authorization: Bearer`, manejo del cuerpo de error único
  `{code,message,details}`. En 401 → volver a login.
- Guardar el rol del token para ocultar acciones solo-admin (una pista, no una barrera).
- Todo con **Docker** (`docker compose build app`); **commits pequeños** (`app(pantallas): …`) y
  **push** a `origin` (fork `…-app`).
- Toda tarea exige **evidencia** (build sin errores / recorrido manual).

## Tus tareas
`APP-01`…`APP-11` (ver §9.8). Modelo: `opencode/gemini-3.6-flash`
(fallback `google/gemini-3.6-flash`). Puede avanzar contra el contrato antes de que `api` termine.

## Flujo por tarea
1. Toma un sub-task con `deps` en `[*]`; pásalo a `[/]` en §9.8 con `agente:` y hora.
2. Implementa leyendo el contrato.
3. Corre la evidencia exacta de §9.8.
4. `git commit` (`app(pantallas): …`) y `git push origin main`.
5. Marca `[x]` COMPLETO. Añade fila a la bitácora (§12).

No toques repos de otros workstreams. No marques `[*]`.
