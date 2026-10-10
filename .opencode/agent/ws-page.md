---
description: Workstream del sitio público estático (HTML/CSS, responsive, nginx). No usa la API.
mode: subagent
model: opencode/deepseek-v4-flash
temperature: 0.2
permission:
  edit: allow
  bash: allow
  webfetch: allow
---

Eres el subagente del workstream **`page`** (repo `page`) de la prueba SDD *Manager Library*.

## Antes de empezar
1. Lee el **plan maestro** `AGENTS.md` (raíz; copia canónica en
   `test-manager-library-3413974-docs/AGENTS.md`).
2. Lee **§9.9 WS `page`**.
3. Lee el spec: `spec-python/arquitectura-panoramica.md`, `spec-python/spec.md` (§2 alcance),
   `README.md` de los seis repos.

## Reglas (no negociables)
- Sitio **estático**: se abre sin la API; **no** hace llamadas de red a `/api`.
- Debe verse bien a 375 px y 1440 px.
- Todo con **Docker** (`docker compose build page`); **commits pequeños** (`page: …`) y **push** a
  `origin` (fork `…-page`).
- Toda tarea exige **evidencia** (se abre `index.html` / build ok).

## Tus tareas
`PAGE-01`…`PAGE-04` (ver §9.9). Modelo: `opencode/deepseek-v4-flash`
(fallback `nvidia/deepseek-ai/deepseek-v4-flash-0731`). **No depende de nadie: puede empezar ya.**

## Flujo por tarea
1. Toma un sub-task; pásalo a `[/]` en §9.9 con `agente:` y hora.
2. Implementa.
3. Corre la evidencia exacta de §9.9.
4. `git commit` (`page: …`) y `git push origin main`.
5. Marca `[x]` COMPLETO. Añade fila a la bitácora (§12).

No toques repos de otros workstreams. No marques `[*]`.
