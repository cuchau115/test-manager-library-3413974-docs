# ADR-RL-007 · Ramas y worktrees: commit directo a `main` y paralelismo por worktree dentro del `api`

- **Estado:** aceptada
- **Deriva de:** la decisión abierta nº 3 de [`../../AGENTS.md`](../../AGENTS.md) §11 y de la sección
  de trabajo en paralelo [`../../AGENTS.md`](../../AGENTS.md) §7.

## Contexto

El reto se reparte en **seis repositorios** independientes (`docs`, `api`, `app`, `page`, `infra`,
`tool`), cada uno clonado como hermano y con su propio árbol de trabajo Git. Dentro del repo `api`
conviven **seis workstreams** (`api-found`, `api-domain`, `api-app`, `api-adapters`, `api-http`,
`api-tests`) que tocan carpetas distintas pero comparten un único árbol de trabajo y un único índice
de Git.

Hay que decidir **cómo se ramifica y cómo se paraleliza** sin que dos agentes pisen el índice del
mismo repo ni se generen conflictos difíciles de resolver, y sin romper la regla dura nº 5 (commits
pequeños, un sub-task = ≥1 commit) ni la regla dura nº 10 (una tarea a la vez por agente).

## Alternativas

1. **Una rama de feature por tarea en cada repo + *pull request*.** Descartada: el plan exige subir
   cada decisión **como commit al fork** (`cuchau115/…-*`), no requiere revisión por PR, y multiplica
   la ceremonia (rama, PR, merge) para tareas pequeñas y encadenadas.
2. **Todo el trabajo del `api` en una sola rama compartida por todos los workstreams.** Descartada:
   dos agentes sobre el mismo árbol de trabajo colisionan en el índice y en los archivos compartidos
   (`routes/api.php`, `app/Providers/CompositionServiceProvider.php`).
3. **Un clon completo del repo por workstream.** Descartada: duplica el repositorio, desincroniza
   *remotes* y complica el push a `main`.
4. **Commit directo a `main` de cada fork; `git worktree` (`ws/<ws>`) para paralelizar dentro del
   `api`, fusionando a `main` y eliminando el worktree al cerrar.** **Elegida** (decisión confirmada
   en [`../../AGENTS.md`](../../AGENTS.md) §11).

## Decisión

1. **Rama de trabajo por defecto:** cada repo commitea **directo a `main`** de su fork
   (`origin = cuchau115/…`), con `git push origin main`. Nunca al repositorio original (`code-sena/…`).
2. **Unidad de paralelismo segura = repositorio distinto.** Dos agentes pueden trabajar a la vez si
   tocan repos distintos (`page` ‖ `tool` ‖ `app` ‖ `infra` ‖ `api`), porque cada repo es un árbol de
   trabajo Git independiente y no hay contención de índice.
3. **Dentro del `api` (un solo árbol de trabajo) no se lanzan dos agentes.** Dos modos:
   - **Modo seguro (por defecto):** un solo agente por repo; las tareas del `api` se hacen **en
     serie** (`api-domain` → `api-app` → `api-adapters` → `api-http` → `api-tests`).
   - **Modo worktrees (avanzado):** un árbol de trabajo por workstream con
     `git -C test-manager-library-3413974-api worktree add ../api-ws-<ws> -b ws/<ws>`; cada agente
     trabaja en su carpeta `../api-ws-<ws>`. Al cerrar, se fusiona `ws/<ws>` → `main` y se ejecuta
     `git worktree remove`. **No se reutiliza la misma carpeta para dos workstreams.**
4. **El contrato congelado habilita el paralelismo entre repos:** como `api-contract.md` y
   `data-model.md` no cambian, `app`, `page` y `tool` pueden avanzar contra el contrato **antes** de
   que `api` esté lista (con datos de prueba). `page` no depende de nadie: puede empezar de
   inmediato.

## Consecuencias

- Se evita toda contención de índice: cada workstream del `api` en modo worktrees tiene su propio
  índice y su propia rama `ws/<ws>`.
- Los *commits* siguen siendo pequeños y por sub-task, y se integran a `main` por fusión de
  `ws/<ws>`.
- El historial de `main` permanece lineal y legible por área (prefijos `api(...)`, `app(...)`, etc.).
- No hace falta revisión por PR ni ramas de larga vida: el flujo es `main` + worktrees efímeros.
- Requiere disciplina: no compartir carpeta entre workstreams y eliminar el worktree (`git worktree
  remove`) tras la fusión para no dejar árboles huérfanos.

## Cómo se verifica

- `git -C test-manager-library-3413974-api worktree add ../api-ws-domain -b ws/domain` crea el árbol
  aislado; `git worktree list` lo muestra.
- Tras fusionar `ws/<ws>` → `main`, `git worktree remove ../api-ws-<ws>` deja `git worktree list`
  con un solo árbol.
- `git -C <repo> remote -v` confirma que `origin` apunta a `cuchau115/…` y nunca a `code-sena/…`
  antes de cada `push`.
