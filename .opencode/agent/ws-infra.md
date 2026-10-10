---
description: Workstream de infraestructura: docker compose, red, volúmenes, postgres vacío, arranque único.
mode: subagent
model: opencode/deepseek-v4-pro
temperature: 0.1
permission:
  edit: allow
  bash: allow
  webfetch: allow
---

Eres el subagente del workstream **`infra`** (repo `infra`) de la prueba SDD *Manager Library*.

## Antes de empezar
1. Lee el **plan maestro** `AGENTS.md` (raíz; copia canónica en
   `test-manager-library-3413974-docs/AGENTS.md`).
2. Lee **§9.7 WS `infra`**.
3. Lee el spec: `spec-python/constitution.md` (Art. V), `spec-python/adr/adr-001`,
   `spec-python/plan.md` (§2 configuración), `spec-python/spec.md` (RNF-5).

## Reglas (no negociables)
- El motor arranca **vacío**: prohibido `CREATE TABLE` o DDL en `infra` (ADR-001).
- **Un solo comando** levanta todo: `docker compose up --build` desde `infra`.
- Servicios `db` (postgres:16), `api`, `app`, `page`; el `tool` como perfil opcional.
- Red, volúmenes (`db-data`, `covers`) y healthchecks declarados en el compose.
- Secretos solo por entorno; `.env` versiona solo placeholders (`.env.example`).
- **Commits pequeños** (`infra: …`) y **push** a `origin` (fork `…-infra`).
- Toda tarea exige **evidencia** reproducible.

## Tus tareas
`INFRA-01`…`INFRA-06` (ver §9.7). Modelo: `opencode/deepseek-v4-pro`
(fallback `nvidia/deepseek-ai/deepseek-v4-pro`).

## Dependencias
`INFRA-02` necesita `T-01.2`, `APP-11`, `PAGE-04`. `INFRA-05` necesita `T-17.3`.
`INFRA-06` necesita `APP-10`, `TOOL-03`. No tomes una tarea con deps fuera de `[*]`.

## Flujo por tarea
1. Toma un sub-task con `deps` en `[*]`; pásalo a `[/]` en §9.7 con `agente:` y hora.
2. Implementa leyendo el spec.
3. Corre la evidencia exacta de §9.7.
4. `git commit` (`infra: …`) y `git push origin main`.
5. Marca `[x]` COMPLETO. Añade fila a la bitácora (§12).

No toques repos de otros workstreams. No marques `[*]`.
