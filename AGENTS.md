# AGENTS.md — Manager Library · prueba SDD ficha 3413974

> **Versión maestra.** Copia canónica versionada en
> `test-manager-library-3413974-docs/AGENTS.md` (se commitea y se sube al fork `docs`).
> Este archivo en la raíz del proyecto existe para que opencode lo cargue desde cualquier
> subcarpeta. Tras editar aquí, sincronizar la copia de `docs` y commitear.

Este documento es el **plan de trabajo completo y autocontenido**. Un agente que lo lea debe poder
tomar cualquier tarea, saber exactamente qué hacer, con qué evidencia cerrarla, con qué modelo
ejecutarla y cómo commitearla. No se asume memoria de ningún chat anterior.

---

## 0. Cómo usar este archivo

1. Lee §1 (reglas duras) y §2 (fuentes de verdad) **antes** de tocar nada.
2. Para tomar una tarea: busca en §9 un `- [ ]` con sus dependencias en `[*]` FINALIZADO.
3. Cámbiala a `[/]` EN PROGRESO, pon tu nombre de agente y la hora.
4. Trabaja LEYENDO el archivo del spec que la tarea cita (nunca de memoria).
5. Cuando el código y su evidencia local existan y hayas hecho commit: `[x]` COMPLETO.
6. Cuando esté **pusheado al fork** y la evidencia se pueda reproducir: `[*]` FINALIZADO.
7. Anota tu paso en la **bitácora** (§12).

---

## 1. Reglas duras (no negociables)

1. **Todo se ejecuta con Docker.** Nada de XAMPP. Nada de instalar PHP/Node en el host para correr
   el sistema. Todo comando de ejecución/prueba es `docker compose …` desde `infra`.
2. **Se construye LEYENDO el spec, nunca de memoria.** Antes de cada tarea, abre el archivo del spec
   que la tarea cita (§2). Si el spec y tu recuerdo difieren, gana el spec.
3. **Cada decisión se documenta y se sube como commit al fork** cuyo `origin` es
   `cuchau115/test-manager-library-3413974-*`. **Nunca** al repo original (`code-sena/…`).
4. **Primero arquitectura (commits). Luego código.** Ninguna tarea de código empieza sin su ADR o
   documento de arquitectura ya commiteado.
5. **Commits pequeños y seguidos:** un sub-task (T-xx.y) = al menos un commit. Un commit = un cambio
   coherente. Mensaje en imperativo, con prefijo de área (ver §6).
6. **Toda tarea exige EVIDENCIA reproducible** (un comando que se pueda correr). Sin evidencia, la
   tarea **no** está terminada (Artículo XII de la constitución).
7. **Arquitectura hexagonal idéntica al spec** (Artículos I–III): el dominio no depende de nada; los
   puertos los define la capa de aplicación; un único punto de composición ata puertos a adaptadores.
8. **Idioma:** código, columnas y rutas en inglés; documentación y mensajes al usuario en español.
9. **Secretos solo por entorno.** `.env` fuera de git; se versiona solo `.env.example`.
10. **Una tarea a la vez por agente.** Ningún agente edita archivos de una tarea en curso de otro.

---

## 2. Fuentes de verdad (el spec)

Repositorio `test-manager-library-3413974-docs`. Contiene **dos specs del mismo negocio**, uno por
tecnología de origen:

- **`spec-python/`** (FastAPI/SQLAlchemy/Alembic/pytest) — **elegida como base**: `spec.md`,
  `data-model.md` y `api-contract.md` son idénticos en ambas, así que el negocio no cambia.
- **`spec-.net/`** (ASP.NET/EF Core) — misma constitución, HU, CA, RN, RNF, modelo y contrato; solo
  difiere lo tecnológico (`constitution.md`, `plan.md`).

**El reto no se hace en Python ni en .NET, sino en React + PHP/Laravel** (decisión ya tomada): hay que
**traducir el spec** a ese stack. La carpeta `spec-react-laravel/` (más abajo) es esa traducción.

Se lee en este orden (base `spec-python/`; si una regla de negocio difiriera de `spec-.net/`, gana
`spec-python/` y la diferencia se anota):

| Documento | Ruta | Para qué |
|---|---|---|
| Constitución | `spec-python/constitution.md` | Principios innegociables (Art. I–XII) |
| Especificación | `spec-python/spec.md` | Actores, HU-01…HU-10, CA, RN-1…RN-6, RNF-1…RNF-5 |
| Plan | `spec-python/plan.md` | Decisiones D-01…D-12 y entorno |
| Arquitectura | `spec-python/architecture.md` | Capas, agregados, flujos |
| Panorama | `spec-python/arquitectura-panoramica.md` | Visión de una página |
| Modelo de datos | `spec-python/data-model.md` | Tablas, columnas, restricciones, índices |
| Contrato API | `spec-python/api-contract.md` | Rutas, cuerpos, códigos, errores |
| Tareas | `spec-python/tasks.md` | T-01…T-23 (base del tablero §9) |
| ADRs | `spec-python/adr/adr-001…004` | Esquema, concurrencia, baja lógica, reporte |

Traducción al stack del reto (decisión ya tomada): carpeta **`spec-react-laravel/`** del mismo fork
`docs` (arquitectura hexagonal en Laravel + ADR-RL-001…005). Si aún no existe, la tarea **DOC-01** la
crea; es requisito previo de todo el código.

**Regla de oro:** lo que el spec dice de **negocio** se respeta literal; lo que dice de **tecnología**
(FastAPI/SQLAlchemy/Alembic/pytest del spec Python, o ASP.NET/EF Core del spec .NET) se traduce a
**Laravel/React** sin cambiar el comportamiento observable. `data-model.md` y `api-contract.md` se
implementan **sin cambios**.

---

## 3. Stack y arquitectura

- Backend: **PHP 8.3 + Laravel 11**, **PostgreSQL 16** (esquema `library`), JWT HS256.
- Frontend: **React 18 + Vite**.
- Sitio público: **estático** (sin API).
- Empaquetado: **Docker + Docker Compose**. Un solo `docker compose up` desde `infra`.

Arquitectura hexagonal dentro de `api/app/`:

```text
app/Domain/          # PHP puro: agregados y objetos de valor (sin Illuminate)
app/Application/
  Ports/             # interfaces puras (repositorios, Clock, PasswordHasher, TokenIssuer, CoverStorage, ReportReader)
  Services/          # un servicio por caso de uso
app/Infrastructure/
  Persistence/       # modelos Eloquent + repositorios (implementan puertos)
  Security/          # Argon2id, JWT
  Storage/           # CoverStorage en disco
app/Http/            # Controllers, Requests, Resources, Middleware
app/Providers/CompositionServiceProvider.php   # ÚNICO punto de composición
database/migrations/ # TODO el DDL + semilla de las 5 categorías
routes/api.php       # /api/v1
```

**Invariantes clave del negocio (resumen; el detalle está en el spec):** disponibles entre 0 y total;
total ≥ 1; préstamo de 1 a 3 líneas sin repetir libro; vencimiento = `loaned_at + 14 días`; máximo 3
libros sin devolver por socio; socio con vencidos no pide; estado del préstamo (`open`/`overdue`/
`closed`) **calculado**, no almacenado; lo congelado en la línea (título, ISBN, categoría) no sigue al
catálogo; baja lógica de libros; concurrencia optimista sobre ejemplares (testigo de versión +
`CHECK ck_book_available_range`).

---

## 4. Los seis repositorios y su papel

| Repo | Papel | Remote (fork) |
|---|---|---|
| `test-manager-library-3413974-docs` | Spec + traducción React/Laravel + este plan | `cuchau115/…-docs` |
| `test-manager-library-3413974-api` | Backend Laravel | `cuchau115/…-api` |
| `test-manager-library-3413974-app` | Frontend React | `cuchau115/…-app` |
| `test-manager-library-3413974-page` | Sitio público estático | `cuchau115/…-page` |
| `test-manager-library-3413974-infra` | `docker compose`, red, volúmenes, motor vacío | `cuchau115/…-infra` |
| `test-manager-library-3413974-tool` | Sembrador de demo (usa la API) | `cuchau115/…-tool` |

Todos los repos están clonados como hermanos de este archivo, cada uno en la rama `main`.

---

## 5. Marcado de tareas (leyenda)

Cada tarea es una línea:

```
- [ ] `T-01.1` <qué> · deps:<ids|—> · ev:<comando> · model:<id> · agente:<—|nombre> · commit:<hash|—>
```

El **checkbox** lleva el estado; el resto son campos que el agente actualiza:

| Marca | Estado | Significado | Quién lo pone |
|---|---|---|---|
| `- [ ]` | `PENDIENTE` | Sin empezar | — |
| `- [/]` | `EN PROGRESO` | Un agente la tomó | El agente al empezar (pon `agente:` y hora) |
| `- [x]` | `COMPLETO` | Código hecho + commit local + evidencia local reproducida | El agente |
| `- [*]` | `FINALIZADO` | **Pusheado al fork** + evidencia reproducible por otro | El agente (o el verificador) |

Reglas de marcado:
- No tomes una tarea con `deps` que no estén en `[*]`.
- No marques `[*]` sin haber hecho `git push` al fork y sin `commit:` con el hash.
- Si te bloqueas, deja `[/]` y añade `BLOQUEADO:` con el motivo; documenta en la bitácora.

---

## 6. Reglas de commits y push

- Prefijo de área + imperativo en español, sin punto final. Ejemplos:
  - `api(dominio): agregar objeto de valor Isbn`
  - `api(http): exponer POST /api/v1/loans`
  - `infra: levantar postgres vacio y api con un comando`
  - `docs(adr): registrar ADR-RL-006 sobre sembrado de vencidos`
  - `app(pantallas): listar y buscar socios`
- Un sub-task = ≥1 commit. Nunca commits gigantes que mezclen áreas.
- Antes de commitear: `git -C <repo> status` y `git -C <repo> diff` para verificar que solo entra lo
  de tu tarea.
- **Push (regla 3):** siempre a `origin` del fork del repo que estás tocando:
  `git -C <repo> push origin main`. Verifica con `git -C <repo> remote -v` que `origin` apunta a
  `cuchau115/…` y **nunca** a `code-sena/…`.
- Autenticación de push: usa el Credential Manager de Windows (no hay `gh` instalado). Si un push
  pide credenciales, pára y avisa; no cambies la config global de git.

---

## 7. Trabajo en paralelo (varios subagentes)

**Unidad de paralelismo segura = repositorio distinto.** Dos agentes pueden trabajar a la vez si
tocan repos distintos (`api` ‖ `app` ‖ `page` ‖ `tool` ‖ `infra`). Motivo: cada repo es un árbol de
trabajo Git independiente; no hay contención de índice.

**Dentro de un mismo repo (`api` tiene 6 workstreams):** NO lanzar dos agentes sobre el mismo árbol de
trabajo. Dos opciones:
- **Modo seguro (por defecto):** un solo agente por repo; las tareas del `api` se hacen en serie.
- **Modo worktrees (avanzado):** para paralelizar dentro del `api`, crear un worktree por workstream:
  `git -C test-manager-library-3413974-api worktree add ../api-ws-<ws> -b ws/<ws>` y trabajar cada
  agente en su carpeta; al cerrar, fusionar `ws/<ws>` → `main` y `git worktree remove`.
  No reutilizar la misma carpeta para dos workstreams.

**Matriz de paralelismo (qué puede correr a la vez sin colisiones de archivos):**

| Puede correr en paralelo con | Workstreams |
|---|---|
| Todo (repos distintos) | `page` ‖ `tool` ‖ `app` ‖ `infra` ‖ `api` |
| Entre sí dentro de `api` (con worktrees) | `api-found` ‖ `api-domain` ‖ `api-app` ‖ `api-adapters` ‖ `api-http` ‖ `api-tests` |
| Serial (mismo archivo) | `api-domain` → `api-app` → `api-adapters` → `api-http` → `api-tests` |

**Contrato congelado habilita paralelismo:** como `api-contract.md` y `data-model.md` no cambian,
`app`, `page` y `tool` pueden avanzar contra el contrato **antes** de que `api` esté lista (con datos
de prueba). `page` no depende de nada: se puede empezar de inmediato.

---

## 8. Asignación de modelos (plan opencode Zen)

Modelo principal en la columna **Zen** (`opencode/<id>`). Como no todos los `opencode/<id>` funcionan
en todos los proveedores, se dan equivalentes en `nvidia` y `google` (que sí están autenticados).
Si un modelo no responde, usa su equivalente de otra columna.

| Rol / workstream | Zen (principal) | Equivalente nvidia | Equivalente google |
|---|---|---|---|
| Orquestador / planificación | `opencode/big-pickle` | — | — |
| Fundaciones / boilerplate / config | `opencode/deepseek-v4-flash` | `nvidia/deepseek-ai/deepseek-v4-flash-0731` | `google/gemini-2.5-flash` |
| Dominio (invariantes) | `opencode/deepseek-v4-pro` | `nvidia/deepseek-ai/deepseek-v4-pro` | — |
| Aplicación (casos de uso) | `opencode/deepseek-v4-pro` | `nvidia/deepseek-ai/deepseek-v4-pro` | — |
| Adaptadores (Eloquent, JWT, storage) | `opencode/qwen3-coder` | `nvidia/qwen/qwen3-coder-480b-a35b-instruct` | — |
| HTTP / controladores / resources | `opencode/gpt-5.2-codex` | — | `google/gemini-3.6-flash` |
| Pruebas (arquitectura, contrato, concurrencia) | `opencode/deepseek-v4-pro` | `nvidia/deepseek-ai/deepseek-v4-pro` | — |
| Frontend React | `opencode/gemini-3.6-flash` | — | `google/gemini-3.6-flash` |
| Sitio público estático (`page`) | `opencode/deepseek-v4-flash` | `nvidia/deepseek-ai/deepseek-v4-flash-0731` | `google/gemini-2.5-flash` |
| Sembrador (`tool`) | `opencode/deepseek-v4-flash` | `nvidia/deepseek-ai/deepseek-v4-flash-0731` | `google/gemini-2.5-flash` |
| Infra / compose | `opencode/deepseek-v4-pro` | `nvidia/deepseek-ai/deepseek-v4-pro` | — |
| Scribe (documentación/ADRs/merge) | `opencode/glm-5.3-flash` | `nvidia/z-ai/glm-5.3-flash` | `google/gemini-2.5-flash` |
| Verificador (marca FINALIZADO) | `opencode/deepseek-v4-pro` | `nvidia/deepseek-ai/deepseek-v4-pro` | — |

Las definiciones de subagente ya creadas (`.opencode/agent/…` en `docs` y en la raíz) apuntan a estos
modelos.

---

## 9. Tablero de tareas

Convención de IDs: `T-xx.y` deriva de las tareas `T-xx` del spec. `DOC-nn`, `INFRA-nn`, `APP-nn`,
`PAGE-nn`, `TOOL-nn` son propias del reto (traducción y empaquetado).

### 9.0 DOC — documentación y ADRs (repo `docs`)

- [*] `DOC-01` Crear `spec-react-laravel/` (README, arquitectura, plan-tecnologico, mapeo-spec, ADR-RL-001…005) **mapeando `spec-python/` y `spec-.net/`** a Laravel/React. · deps:— · ev: existe la carpeta y `spec-react-laravel/arquitectura.md` cita Art. I–III · model:`opencode/glm-5.3-flash` · agente:scribe (big-pickle) · commit:a6a4f5a
- [*] `DOC-02` ADR-RL-006: cómo el `tool` produce 3 préstamos vencidos sin SQL directo (ver §11, decisión abierta). · deps:DOC-01 · ev: ADR escrito con alternativas y decisión · model:`opencode/glm-5.3-flash` · agente:scribe (big-pickle) · commit:6d36dfe
- [*] `DOC-03` ADR-RL-007: estrategia de ramas/worktrees para trabajo en paralelo. · deps:DOC-01 · ev: ADR escrito · model:`opencode/glm-5.3-flash` · agente:scribe (big-pickle) · commit:233f51b
- [*] `DOC-04` ADR-RL-008: ruta de salud (`/health` y `/api/v1/health`) — ver §11. · deps:DOC-01 · ev: ADR escrito · model:`opencode/glm-5.3-flash` · agente:scribe (big-pickle) · commit:e6bca8a
- [*] `DOC-05` Tras T-18: actualizar `spec-python/data-model.md` §4 moviendo `ck_book_total_positive` y `ck_user_role` de `pendiente` a `motor` (Art. X). · deps:T-18.1,T-18.2 · ev: §4 sin marcas `pendiente` para esas reglas · model:`opencode/glm-5.3-flash` · agente:big-pickle · commit:95fd16d

### 9.1 WS `api-found` — fundaciones del backend (repo `api`)

- [*] `T-01.1` Scaffold Laravel 11 + carpetas hexagonales (`app/Domain`, `Application/Ports`, `Application/Services`, `Infrastructure/*`, `Http`, `Providers`). · deps:— · ev:`docker compose run --rm api php artisan --version` imprime `Laravel Framework 11.x` · model:`opencode/deepseek-v4-flash` · agente:found (big-pickle) · commit:45b5dd5
- [*] `T-01.2` `api/Dockerfile` (php:8.3-fpm + nginx) y assets de arranque. · deps:T-01.1 · ev:`docker compose build api` termina sin error · model:`opencode/deepseek-v4-flash` · agente:found (big-pickle) · commit:67560c0
- [*] `T-01.3` `.env.example` y `config/*`: `DATABASE_URL`,`JWT_SECRET`,`ADMIN_USERNAME`,`ADMIN_PASSWORD`,`COVERS_DIR`,`CORS_ORIGIN`,`APP_URL`. · deps:T-01.1 · ev: app arranca sin claves en el repo (`git grep -i secret` sin hallazgos) · model:`opencode/deepseek-v4-flash` · agente:found (big-pickle) · commit:843133f
- [*] `T-01.4` `GET /health` y `GET /api/v1/health` → `{"status":"ok"}` (públicas). · deps:T-01.2 · ev:`curl -s localhost:8000/api/v1/health` → `{"status":"ok"}` · model:`opencode/deepseek-v4-flash` · agente:found (big-pickle) · commit:ca6c89b
- [*] `T-01.5` CORS por `CORS_ORIGIN`. · deps:T-01.3 · ev:petición con `Origin` recibe cabecera `Access-Control-Allow-Origin` exacta · model:`opencode/deepseek-v4-flash` · agente:found (big-pickle) · commit:046716f

### 9.2 WS `api-domain` — dominio (repo `api`, PHP puro, Art. I)

- [*] `T-03.1` Objeto de valor `Isbn` (13 dígitos). · deps:T-01.1 · ev:`php artisan test --filter=IsbnTest` verde · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:f2cbd05
- [*] `T-03.2` Objeto de valor `Quantity` (>0, disponibles en rango). · deps:T-03.1 · ev:`php artisan test --filter=QuantityTest` verde · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:f2cbd05
- [*] `T-03.3` Objeto de valor `DateRange` (fin ≥ inicio). · deps:T-03.1 · ev:`php artisan test --filter=DateRangeTest` verde · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:f2cbd05
- [*] `T-03.4` Errores de dominio base (`DomainError` y derivados; sin framework). · deps:T-01.1 · ev:existen `BookNotAvailable`,`MemberHasOverdue`,`MemberLimitExceeded`,`ItemAlreadyReturned` · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:3bb70eb
- [*] `T-04.1` Agregado `Book` (`withdraw`,`restock`, baja lógica, total ≥1, disponibles 0..total). · deps:T-03.2,T-03.4 · ev:`php artisan test --filter=BookTest` verde (nunca <0 ni >total) · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:bf5b9fe
- [*] `T-05.1` `LoanItem` + `Loan::addItem` (1..3 líneas, sin libro repetido, congela título/ISBN/categoría). · deps:T-04.1 · ev:`php artisan test --filter=LoanAddItemTest` verde · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:4ed77a9
- [*] `T-05.2` `Loan::returnItem` (una vez por línea) + estado calculado (`open`/`overdue`/`closed`). · deps:T-05.1 · ev:`php artisan test --filter=LoanReturnTest` verde · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:4ed77a9
- [*] `T-05.3` Vencimiento `loaned_at + 14 días` y máximo 3 sin devolver por socio (con `Clock` falso). · deps:T-05.1 · ev:`php artisan test --filter=LoanLimitTest` verde · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:4ed77a9
- [*] `T-06.1` Agregado `Member` (`DocumentNumber` obligatorio). · deps:T-03.4 · ev:`php artisan test --filter=MemberTest` verde · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:4c86693
- [*] `T-06.2` Agregado `User` + enum `Role` (`admin`,`librarian`) + normalización de `username` (minúsculas, recortado). · deps:T-03.4 · ev:`php artisan test --filter=UserTest` verde: `"Ana "` → `ana` · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:4c86693
- [*] `T-06.3` Prueba de arquitectura: `app/Domain` no importa `Illuminate\*`. · deps:T-04.1,T-06.2 · ev:`php artisan test --filter=DomainIsolationTest` verde y falla si se añade un `use Illuminate` · model:`opencode/deepseek-v4-pro` · agente:domain (big-pickle) · commit:c2e49d9

### 9.3 WS `api-app` — puertos y casos de uso (repo `api`, Art. II)

- [*] `T-07.1` Definir puertos outbound: `BookRepository`,`LoanRepository`,`MemberRepository`,`UserRepository`,`ReportReader`,`Clock`,`PasswordHasher`,`TokenIssuer`,`CoverStorage`. Firmas sin tipos de framework. · deps:T-06.3 · ev:existen las 9 interfaces en `app/Application/Ports`; ninguna importa Illuminate · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:873662d
- [*] `T-07.2` `LoginService` (con `PasswordHasher` + `TokenIssuer` falsos). · deps:T-07.1,T-06.2 · ev:`php artisan test --filter=LoginServiceTest` verde (HU-01) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:7d3d326
- [*] `T-07.3` `CreateLibrarianService` (rol admin pedido por API → rechazo de dominio). · deps:T-07.1,T-06.2 · ev:`php artisan test --filter=CreateLibrarianTest` verde (HU-02) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:7d3d326
- [*] `T-08.1` `CreateBookService`. · deps:T-07.1,T-04.1 · ev:`php artisan test --filter=CreateBookServiceTest` verde (HU-03) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:cea45e8
- [*] `T-08.2` `SearchBooksService` (texto, categoría, activos, orden por título, paginación ≤50). · deps:T-07.1 · ev:`php artisan test --filter=SearchBooksServiceTest` verde (HU-04) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:cea45e8
- [*] `T-08.3` `UpdateBookService` (cambiar total ajusta disponibles sin bajar de 0). · deps:T-08.1 · ev:`php artisan test --filter=UpdateBookServiceTest` verde (CA-03.3) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:cea45e8
- [*] `T-08.4` `DeleteBookService` (baja lógica; bloquea si hay préstamos abiertos). · deps:T-08.1 · ev:`php artisan test --filter=DeleteBookServiceTest` verde (CA-03.5) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:cea45e8
- [*] `T-08.5` `SetCoverService` / `RemoveCoverService` (clave opaca; sin portada = `null`). · deps:T-08.1 · ev:`php artisan test --filter=CoverServiceTest` verde (CA-03.4) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:cea45e8
- [*] `T-08.6` `CreateMemberService`,`ListMembersService`,`GetMemberService`. · deps:T-07.1,T-06.1 · ev:`php artisan test --filter=MemberServiceTest` verde (HU-05) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:cea45e8
- [*] `T-09.1` `LendBooksService` (1..3 líneas, sin repetido, ≥3 sin devolver, vencidos, sin ejemplares). · deps:T-05.3,T-08.1,T-08.6 · ev:`php artisan test --filter=LendBooksServiceTest` verde (HU-06) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:40c69cc
- [*] `T-10.1` `ReturnItemService` (una línea; doble devolución → `ITEM_ALREADY_RETURNED`). · deps:T-09.1 · ev:`php artisan test --filter=ReturnItemServiceTest` verde (HU-07) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:40c69cc
- [*] `T-10.2` `OverdueService` (líneas vencidas ordenadas por días de retraso). · deps:T-09.1 · ev:`php artisan test --filter=OverdueServiceTest` verde (HU-09) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:40c69cc
- [*] `T-11.1` `MostBorrowedReportService` + `ReportReader` (agrega por valores congelados; rango invertido → 422). · deps:T-09.1 · ev:`php artisan test --filter=MostBorrowedReportTest` verde (HU-10, ADR-004) · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:40c69cc
- [*] `T-11.2` Prueba de arquitectura: `app/Application` no importa `app/Infrastructure`. · deps:T-11.1 · ev:`php artisan test --filter=ApplicationIsolationTest` verde y falla si se viola · model:`opencode/deepseek-v4-pro` · agente:application (big-pickle) · commit:3a62753

### 9.4 WS `api-adapters` — adaptadores (repo `api`)

- [*] `T-02.1` Migración inicial: 6 tablas (`category`,`book`,`member`,`loan`,`loan_item`,`user`) con columnas de `data-model.md` §3 y **sin `DEFAULT`**. · deps:T-01.2 · ev:consulta §10 de `data-model.md` devuelve lo documentado · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:6e5c3f2
- [*] `T-02.2` FKs (§5) e índices únicos (§4), incluido el índice parcial de ISBN sobre activos. · deps:T-02.1 · ev:`pg_indexes`/`pg_constraint` coinciden con §4–§5 · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:6e5c3f2
- [*] `T-02.3` Semilla de las 5 categorías con UUID fijos (§9). · deps:T-02.1 · ev:`GET /api/v1/categories` devuelve 5 filas ordenadas por nombre · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:6e5c3f2
- [*] `T-12.1` Modelos Eloquent + `BookRepository` (mapeo dominio↔Eloquent) incl. `version`. · deps:T-02.2,T-08.1 · ev:`php artisan test --filter=BookRepositoryTest` verde contra PostgreSQL real · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:741e0ec
- [*] `T-12.2` `MemberRepository` y `UserRepository`. · deps:T-02.2,T-08.6 · ev:`php artisan test --filter=MemberUserRepositoryTest` verde · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:741e0ec
- [*] `T-13.1` `LoanRepository` (guardar préstamo + líneas en una transacción). · deps:T-12.1,T-09.1 · ev:`php artisan test --filter=LoanRepositoryTest` verde · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:48bc1e8
- [*] `T-13.2` Concurrencia optimista: `UPDATE book … WHERE version = :leida`; conflicto → `BOOK_NOT_AVAILABLE`. · deps:T-13.1 · ev:`php artisan test --filter=ConcurrencyTest` verde: dos préstamos del último ejemplar → uno 201, otro 409 (RNF-2) · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:48bc1e8
- [*] `T-14.1` `PasswordHasher` Argon2id. · deps:T-07.1 · ev:`php artisan test --filter=ArgonPasswordHasherTest` verde · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:0da01ad
- [*] `T-14.2` `TokenIssuer` JWT HS256 (8 h, `sub` + `role`, clave de entorno). · deps:T-07.1 · ev:`php artisan test --filter=JwtTokenIssuerTest` verde; el token no incluye `password` · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:0da01ad
- [*] `T-15.1` `CoverStorage` en disco (`COVERS_DIR`, clave opaca). · deps:T-07.1,T-08.5 · ev:`php artisan test --filter=DiskCoverStorageTest` verde · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:0da01ad
- [*] `T-15.2` Validación de imagen por contenido (JPG/PNG, ≤2 MB) y borrado en orden (anular `cover_key`, confirmar, borrar binario). · deps:T-15.1 · ev:`php artisan test --filter=CoverValidationTest` verde (2 MB ok, 3 MB → 422) · model:`opencode/qwen3-coder` · agente:adapters (big-pickle) · commit:0da01ad

### 9.5 WS `api-http` — HTTP y composición (repo `api`)

- [*] `T-16.1` Middleware de auth JWT (firma + vigencia) + autorización por rol. · deps:T-14.2 · ev:`php artisan test --filter=AuthMiddlewareTest` verde: sin token 401, rol insuficiente 403 · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.2` Cuerpo de error único (`code`,`message`,`details`) y mapeo de excepciones de dominio a estados. · deps:T-16.1 · ev:`php artisan test --filter=ErrorBodyTest` verde; nunca expone SQL/trazas · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.3` Endpoints `POST /auth/login` y `GET /health`. · deps:T-16.2,T-07.2 · ev:`curl` login ok (token, role, expires_in 28800); credenciales inválidas → 401 sin filtrar cuál falló · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.4` `POST /users` (admin; rol solo `librarian`, username normalizado, 409 repetido, 422 admin). · deps:T-16.2,T-07.3 · ev:pruebas de contrato de `/users` verdes · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.5` `GET /categories` + `GET/POST/PUT/DELETE /books` + `PUT/DELETE /books/{id}/cover`. · deps:T-16.2,T-08.1,T-08.2,T-08.3,T-08.4,T-08.5 · ev:pruebas de contrato de libros verdes (incluye 404 en libro dado de baja) · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.6` `GET/POST /members` + `GET /members/{id}` (`active_loans`). · deps:T-16.2,T-08.6 · ev:pruebas de contrato de socios verdes · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.7` `POST /loans`, `GET /loans`, `GET /loans/{id}`, `POST /loans/{loan_id}/items/{item_id}/return`, `GET /loans/overdue` (cuidado con el orden de rutas). · deps:T-16.2,T-09.1,T-10.1,T-10.2 · ev:pruebas de contrato de préstamos verdes · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.8` `GET /reports/most-borrowed` (admin; `from`/`to`, rango invertido 422). · deps:T-16.2,T-11.1 · ev:pruebas de contrato del reporte verdes · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-16.9` Resources/DTO: `snake_case`, UUID texto, fechas ISO-8601 `Z`, paginación `{items,page,size,total}`. · deps:T-16.5 · ev:`php artisan test --filter=SerializationTest` verde · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-17.1` `CompositionServiceProvider`: único punto de composición (bindings puerto→adaptador). · deps:T-16.8,T-12.1,T-13.2,T-14.1,T-14.2,T-15.1 · ev:`php artisan test --filter=CompositionIsolationTest` verde; ninguna instanciación de adaptador fuera del provider · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-17.2` Arranque crea el admin inicial desde `ADMIN_USERNAME`/`ADMIN_PASSWORD`. · deps:T-17.1 · ev:con base vacía se puede iniciar sesión como admin · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec
- [*] `T-17.3` Entrypoint del contenedor: `migrate --force` + crear admin + servir; idempotente. · deps:T-17.2 · ev:`docker compose up` deja la API lista y el login admin funciona · model:`opencode/gpt-5.2-codex` · agente:http (big-pickle) · commit:86af7ec

### 9.6 WS `api-tests` — contrato, arquitectura y concurrencia (repo `api`)

- [*] `T-16.10` Prueba de contrato que recorre **todas** las rutas de `api-contract.md` y **todos** los códigos de §2. · deps:T-17.1 · ev:runner Docker: 102 tests y 587 assertions verdes · model:`opencode/deepseek-v4-pro` · agente:api-http-contract · commit:de26756
- [*] `T-19.1` Prueba de arquitectura global (Art. I, II y III) ejecutable. · deps:T-17.1 · ev:runner Docker incluye pruebas de aislamiento de arquitectura y suite verde · model:`opencode/deepseek-v4-pro` · agente:api-http-contract · commit:de26756
- [*] `T-18.1` Bajar `ck_book_total_positive` a la migración. · deps:T-02.1 · ev:PostgreSQL rechaza un `INSERT` con `total_copies=0` · model:`opencode/deepseek-v4-pro` · agente:big-pickle · commit:6e5c3f2
- [*] `T-18.2` Bajar `ck_user_role` a la migración. · deps:T-02.1 · ev:PostgreSQL rechaza un `INSERT` con rol inválido · model:`opencode/deepseek-v4-pro` · agente:big-pickle · commit:6e5c3f2
- [ ] `T-16.11` Prueba de contrato con el sembrador de carga (RNF-1: búsqueda <300 ms con 5000 libros). · deps:TOOL-02 · ev:informe de tiempo reproducible · model:`opencode/deepseek-v4-pro` · agente:— · commit:—

### 9.7 WS `infra` — contenedores y orquestación (repo `infra`)

- [*] `INFRA-01` `docker-compose.yml`: servicio `db` (postgres:16 **vacío**), sin `CREATE TABLE`. · deps:— · ev:`docker compose up db` arranca; `psql` no muestra tablas en `library` · model:`opencode/deepseek-v4-pro` · agente:infra (big-pickle) · commit:d14b6ac
- [*] `INFRA-02` Servicios `api`,`app`,`page` referenciando los Dockerfiles de `../api`,`../app`,`../page`. · deps:T-01.2,APP-11,PAGE-04,INFRA-01 · ev:`docker compose config --quiet` y `docker compose build app page` pasan · model:`opencode/deepseek-v4-pro` · agente:big-pickle · commit:4862ce0
- [*] `INFRA-03` Red, volúmenes (`db-data`, `covers`) y healthchecks. · deps:INFRA-02 · ev:`docker compose up --build -d`; db/api/app/page reportan `healthy` · model:`opencode/deepseek-v4-pro` · agente:big-pickle · commit:6e09314
- [*] `INFRA-04` `.env` de compose (sin secretos reales; placeholders) + `.env.example`. · deps:INFRA-01 · ev:`git grep -iE 'password|secret' -- ':!*.example'` no revela secretos reales · model:`opencode/deepseek-v4-pro` · agente:infra (big-pickle) · commit:183eb8c
- [/] `INFRA-05` README de arranque: **un** comando levanta todo (migraciones + admin). · deps:INFRA-03,T-17.3 · ev:`docker compose up --build -d` deja el stack healthy; `/health` responde; login admin requiere confirmar bootstrap en DB persistente · model:`opencode/deepseek-v4-pro` · agente:big-pickle · commit:40691ad
- [ ] `INFRA-06` Verificación end-to-end documentada (login→prestar→devolver→reporte). · deps:INFRA-05,APP-10,TOOL-03 · ev:transcripción de comandos/curl reproducible · model:`opencode/deepseek-v4-pro` · agente:— · commit:—

### 9.8 WS `app` — frontend React (repo `app`)

- [*] `APP-01` Scaffold Vite + React 18 + estructura de carpetas; `VITE_API_URL`. · deps:— · ev:`docker compose build app` o `npm run build` sin errores · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:303ad56
- [*] `APP-02` Cliente HTTP único (`fetch`): base URL, `Authorization: Bearer`, manejo de cuerpo de error único. · deps:APP-01 · ev:`npm run build` ok; el cliente tipa `{code,message,details}` · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:d59cb35
- [*] `APP-03` Login + guardado de token + redirección en 401. · deps:APP-02 · ev:login manual contra API levanta el token y entra al panel · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:04640d8
- [*] `APP-04` Layout y control de visibilidad por rol (`admin`/`librarian`). · deps:APP-03 · ev:con rol librarian no se ven acciones solo-admin · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:e9b3141
- [*] `APP-05` Catálogo: lista, búsqueda por texto, filtro por categoría, paginación. · deps:APP-04 · ev:recorrido manual responde con la lista y el total · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:f5dd8aa
- [*] `APP-06` Libro: crear/editar/baja + subir/quitar portada (solo admin). · deps:APP-05 · ev:crear libro y subir PNG funciona; baja desaparece del catálogo · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:89451c3
- [*] `APP-07` Socios: lista, búsqueda, crear. · deps:APP-04 · ev:crear socio y verlo en la lista · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:bce9dc7
- [*] `APP-08` Prestar: elegir socio y de 1 a 3 libros; mostrar errores de negocio (409/422). · deps:APP-07,APP-05 · ev:prestar 2 libros ok; repetir libro → mensaje de error del contrato · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:fa93cd7
- [*] `APP-09` Préstamos: listar con filtros, ver detalle, devolver una línea. · deps:APP-08 · ev:devolver una línea actualiza el detalle y el estado · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:59a4756
- [*] `APP-10` Vencidos + Reporte más prestados. · deps:APP-09 · ev:vencidos y reporte muestran datos del sembrador · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:ad1aa17
- [*] `APP-11` `app/Dockerfile` (build + servir estáticos). · deps:APP-01 · ev:`docker compose build app` ok · model:`opencode/gemini-3.6-flash` · agente:app (big-pickle) · commit:52493d6

### 9.9 WS `page` — sitio público estático (repo `page`)

- [*] `PAGE-01` Estructura base (HTML/CSS) + assets. · deps:— · ev:se abre `index.html` sin la API · model:`opencode/deepseek-v4-flash` · agente:page (big-pickle) · commit:2485326
- [*] `PAGE-02` Secciones: qué es, qué construye el spec, stack (React/Laravel/Docker), cómo correr. · deps:PAGE-01 · ev:contenido completo visible · model:`opencode/deepseek-v4-flash` · agente:page (big-pickle) · commit:743aa75
- [*] `PAGE-03` Responsive móvil y escritorio. · deps:PAGE-02 · ev:correcto a 375 px y 1440 px · model:`opencode/deepseek-v4-flash` · agente:page (big-pickle) · commit:aab4a68
- [*] `PAGE-04` `page/Dockerfile` (nginx). · deps:PAGE-01 · ev:`docker compose build page` ok · model:`opencode/deepseek-v4-flash` · agente:page (big-pickle) · commit:fcf1e0c

### 9.10 WS `tool` — sembrador de demostración (repo `tool`)

- [*] `TOOL-01` Cliente API + script base (login admin, llamadas a endpoints). · deps:DOC-02 · ev:`docker compose run --rm tool-tests` + `node --test` en el repo `tool` son verdes · model:`opencode/deepseek-v4-flash` · agente:big-pickle · commit:f131932
- [/] `TOOL-02` Sembrar ≥40 libros y 10 socios. · deps:TOOL-01,T-16.6 · ev:prueba simulada Docker 7/7; integración real detenida porque ADMIN_USERNAME autentica con rol librarian · model:`opencode/deepseek-v4-flash` · agente:big-pickle · commit:955d681
- [/] `TOOL-03` 15 préstamos + 3 vencidos (según ADR-RL-006). · deps:TOOL-02,T-16.7 · ev:el cliente verifica overdue=3 y filas de reporte; integración real detenida por rol inicial incorrecto · model:`opencode/deepseek-v4-flash` · agente:big-pickle · commit:955d681
- [/] `TOOL-04` `tool/Dockerfile` y entrada en compose (perfil opcional). · deps:TOOL-03 · ev:`docker compose --profile tool build tool` correcto; falta run integrado · model:`opencode/deepseek-v4-flash` · agente:big-pickle · commit:37e1aa1

---

## 10. Definición de terminado global

- **Núcleo (mínimo aceptable):** `T-01`…`T-17` con evidencia (`api` operativo + migraciones + admin +
  login). Equivale a la «definición de terminado» del spec.
- **Sobresaliente:** `T-18`…`T-23` (invariantes en la base, pruebas de arquitectura, `infra`, `tool`,
  `app`, `page`) con evidencia, y todo pusheado a los forks antes de la presentación.
- Un sistema que arranca con `docker compose up` desde `infra`, base vacía hasta migrar, `page` visible
  sin API, y `tool` sembrando datos reales.
- Toda tarea en `[*]`; la bitácora §12 refleja el recorrido.

---

## 11. Decisiones abiertas (confirmar antes de las tareas que dependen de ellas)

1. **Vencidos del sembrador (`DOC-02`, `TOOL-03`).** El contrato fija `due_at = loaned_at + 14 días`
   con `loaned_at = ahora`. Para que `tool` produzca 3 vencidos **sin SQL directo**, se propone que
   el `api` acepte, **solo con `APP_ENV=local`**, un parámetro opcional `loaned_at` en `POST /loans`
   (fuera del contrato de producción). Alternativas: (a) un endpoint dev-only de sembrado;
   (b) el sembrador escribe fechas vía endpoint dedicado; (c) permitir SQL en `tool` (viola
   «tool usa la API»). **DECISIÓN CONFIRMADA:** el `api` acepta `loaned_at` opcional **solo con
   `APP_ENV=local`**; se documenta en ADR-RL-006 (`DOC-02`) y `POST /loans` no cambia en producción.
2. **Ruta de salud (`DOC-04`).** El contrato declara base `/api/v1` pero lista `GET /health`. Se
   propone exponer **ambas** (`/health` y `/api/v1/health`). **DECISIÓN CONFIRMADA:** se exponen ambas (ver `DOC-04`).
3. **Rama de trabajo.** Se propone commitear directo a `main` de cada fork; para paralelizar dentro del
   `api`, usar worktrees (§7). **DECISIÓN CONFIRMADA:** commit directo a `main` de cada fork; worktrees para paralelizar dentro del `api`.

---

## 12. Bitácora de agentes

Cada agente que tome, complete o finalice una tarea añade una fila (más reciente abajo).

| Fecha/hora | Agente (modelo) | Tarea | De `→` a | Commit | Nota |
|---|---|---|---|---|---|
| 2026-10-10 10:40 | big-pickle (scribe) | DOC-01 | PENDIENTE → FINALIZADO | a6a4f5a | `spec-react-laravel/` creado (9 archivos); arquitectura cita Art. I–III |
| 2026-10-10 10:55 | big-pickle (found) | T-01.1 | PENDIENTE → FINALIZADO | 45b5dd5 | Laravel 11.57.0 + carpetas hexagonales |
| 2026-10-10 10:58 | big-pickle (found) | T-01.2 | PENDIENTE → FINALIZADO | 67560c0 | Dockerfile php8.3-fpm + nginx; build OK |
| 2026-10-10 10:52 | big-pickle (infra) | INFRA-01 | PENDIENTE → FINALIZADO | d14b6ac | postgres:16 vacío, `\dt` sin relaciones |
| 2026-10-10 10:54 | big-pickle (infra) | INFRA-04 | PENDIENTE → FINALIZADO | 183eb8c | `.env.example` con placeholders |
| 2026-10-10 10:53 | big-pickle (scribe) | DOC-02 | PENDIENTE → FINALIZADO | 6d36dfe | ADR-RL-006 sembrado de vencidos |
| 2026-10-10 10:54 | big-pickle (scribe) | DOC-03 | PENDIENTE → FINALIZADO | 233f51b | ADR-RL-007 ramas y worktrees |
| 2026-10-10 10:56 | big-pickle (scribe) | DOC-04 | PENDIENTE → FINALIZADO | e6bca8a | ADR-RL-008 rutas de salud |
| 2026-10-10 10:57 | big-pickle (page) | PAGE-01 | PENDIENTE → FINALIZADO | 2485326 | estructura base estática |
| 2026-10-10 10:58 | big-pickle (page) | PAGE-02 | PENDIENTE → FINALIZADO | 743aa75 | secciones de presentación |
| 2026-10-10 10:59 | big-pickle (page) | PAGE-03 | PENDIENTE → FINALIZADO | aab4a68 | responsive 375/1440 |
| 2026-10-10 11:00 | big-pickle (page) | PAGE-04 | PENDIENTE → FINALIZADO | fcf1e0c | Dockerfile nginx; build OK |
| 2026-10-10 11:20 | big-pickle (found) | T-01.3 | PENDIENTE → FINALIZADO | 843133f | config/library.php + .env.example; sin secretos en git |
| 2026-10-10 11:22 | big-pickle (found) | T-01.5 | PENDIENTE → FINALIZADO | 046716f | CORS por CORS_ORIGIN; ACAO exacto + preflight 204 |
| 2026-10-10 11:23 | big-pickle (found) | T-01.4 | PENDIENTE → FINALIZADO | ca6c89b | /health y /api/v1/health → {"status":"ok"} |
| 2026-10-10 11:35 | big-pickle (app) | APP-01 | PENDIENTE → FINALIZADO | 303ad56 | Vite + React 18; `npm run build` OK |
| 2026-10-10 11:37 | big-pickle (app) | APP-02 | PENDIENTE → FINALIZADO | d59cb35 | cliente fetch único; ApiError {code,message,details} |
| 2026-10-10 11:39 | big-pickle (app) | APP-11 | PENDIENTE → FINALIZADO | 52493d6 | Dockerfile multi-stage + nginx |
| 2026-10-10 11:25 | big-pickle (found) | INFRA-02 | PENDIENTE → EN PROGRESO | 565f331 | solo servicio api; falta app/page |
| 2026-10-10 11:45 | big-pickle (app) | APP-03 | PENDIENTE → FINALIZADO | 04640d8 | login, token en storage, 401 → /login |
| 2026-10-10 11:47 | big-pickle (app) | APP-04 | PENDIENTE → FINALIZADO | e9b3141 | layout + visibilidad por rol (adminOnly) |
| 2026-10-10 11:49 | big-pickle (app) | APP-05 | PENDIENTE → FINALIZADO | f5dd8aa | catálogo: q, categoría, paginación |
| 2026-10-10 11:51 | big-pickle (app) | APP-07 | PENDIENTE → FINALIZADO | bce9dc7 | socios: lista, búsqueda, alta, DOCUMENT_TAKEN |
| 2026-10-10 12:06 | big-pickle (domain) | T-03.1,T-03.2,T-03.3 | PENDIENTE → FINALIZADO | f2cbd05 | VOs Isbn/Quantity/DateRange con pruebas |
| 2026-10-10 12:07 | big-pickle (domain) | T-03.4 | PENDIENTE → FINALIZADO | 3bb70eb | DomainError + códigos de negocio |
| 2026-10-10 12:08 | big-pickle (domain) | T-04.1 | PENDIENTE → FINALIZADO | bf5b9fe | Book: withdraw/restock/changeTotal/baja lógica |
| 2026-10-10 12:09 | big-pickle (domain) | T-05.1,T-05.2,T-05.3 | PENDIENTE → FINALIZADO | 4ed77a9 | Loan + LoanItem: líneas congeladas, devolución, estado, 14 días |
| 2026-10-10 12:10 | big-pickle (domain) | T-06.1,T-06.2 | PENDIENTE → FINALIZADO | 4c86693 | Member, User, enum Role, normalización username |
| 2026-10-10 12:11 | big-pickle (domain) | T-06.3 | PENDIENTE → FINALIZADO | c2e49d9 | DomainIsolationTest: app/Domain sin Illuminate (47 tests verdes) |
| 2026-10-10 11:55 | big-pickle (app) | APP-06 | PENDIENTE → FINALIZADO | 89451c3 | CRUD libros + portada (blob) solo admin |
| 2026-10-10 11:57 | big-pickle (app) | APP-08 | PENDIENTE → FINALIZADO | fa93cd7 | prestar 1..3 libros; errores 409/422 del contrato |
| 2026-10-10 11:59 | big-pickle (app) | APP-09 | PENDIENTE → FINALIZADO | 59a4756 | prestamos: filtros, detalle, devolver linea |
| 2026-10-10 12:01 | big-pickle (app) | APP-10 | PENDIENTE → FINALIZADO | ad1aa17 | vencidos + reporte mas prestados (admin) |
| 2026-10-10 16:45 | big-pickle (app) | APP-01…APP-11 (E2E) | verificación adicional | — | mock del contrato + Chromium/Playwright: 17/17 curl + 15/15 navegador, 0 errores de consola; evidencia en `spec-react-laravel/evidence/app-e2e/` |
| 2026-10-10 17:30 | big-pickle (adapters) | T-02.1,T-02.2,T-02.3 | PENDIENTE → FINALIZADO | 6e5c3f2 | migración esquema library (6 tablas, FKs, índices parciales, check, 5 categorías seed; seed corregido + checks total≥1 y role) |
| 2026-10-10 17:35 | big-pickle (application) | T-07.1 | PENDIENTE → FINALIZADO | 873662d | definir los nueve puertos de salida y su aislamiento |
| 2026-10-10 17:36 | big-pickle (application) | T-07.2,T-07.3 | PENDIENTE → FINALIZADO | 7d3d326 | login y creación de bibliotecarios con validación de rol |
| 2026-10-10 17:37 | big-pickle (application) | T-08.1…T-08.6 | PENDIENTE → FINALIZADO | cea45e8 | servicios de gestión de libros y socios (CRUD, stock, portada) |
| 2026-10-10 17:38 | big-pickle (application) | T-09.1,T-10.1,T-10.2,T-11.1 | PENDIENTE → FINALIZADO | 40c69cc | servicios de préstamos, devoluciones, vencidos y reporte |
| 2026-10-10 17:39 | big-pickle (application) | T-11.2 | PENDIENTE → FINALIZADO | 3a62753 | prueba de aislamiento: app/Application no importa Infrastructure |
| 2026-10-10 12:18 | big-pickle (tool) | TOOL-01 | PENDIENTE → FINALIZADO | f131932 | cliente API + script base del sembrador; 6/6 pruebas en Docker OK |
| 2026-10-10 18:30 | big-pickle (adapters) | T-12.1,T-12.2 | PENDIENTE → FINALIZADO | 741e0ec | modelos Eloquent + repos Book/Member/User + CategoryReader + CompositionServiceProvider |
| 2026-10-10 19:15 | big-pickle (adapters) | T-13.1,T-13.2 | PENDIENTE → FINALIZADO | 48bc1e8 | LoanRepository + concurrencia optimista (version column) |
| 2026-10-10 19:45 | big-pickle (adapters) | T-14.1,T-14.2,T-15.1,T-15.2 | PENDIENTE → FINALIZADO | 0da01ad | Argon2id, JWT HS256, DiskCoverStorage con validación JPG/PNG ≤2MB |
| 2026-10-10 20:30 | big-pickle (http) | T-16.1…T-17.3 | PENDIENTE → FINALIZADO | 86af7ec | middleware JWT, controladores, recursos, rutas /api/v1, entrypoint con migraciones/admin |
| 2026-10-10 13:31 | big-pickle (tool) | TOOL-02,TOOL-03 | PENDIENTE → EN PROGRESO | 955d681 | sembrado paginado/idempotente; 7/7 pruebas Docker verdes; pendiente integración con API real |
| 2026-10-10 13:37 | big-pickle (verificador) | T-18.1,T-18.2,DOC-05 | PENDIENTE → FINALIZADO | 95fd16d | checks confirmados por PostgreSQL y reglas del modelo marcadas como motor |
| 2026-10-10 13:46 | api-http-contract | T-16.10,T-19.1 | PENDIENTE → FINALIZADO | de26756 | suite Docker: 102 pruebas, 587 assertions; contrato, esquema y arquitectura |
| 2026-10-10 13:51 | big-pickle (infra/tool) | INFRA-03,INFRA-05,TOOL-04 | avance | 40691ad,37e1aa1 | stack completo healthy y perfil de herramienta integrado; login real evidenció rol librarian en el usuario bootstrap |
| 2026-10-10 13:39 | big-pickle (infra) | INFRA-02 | EN PROGRESO → FINALIZADO | 4862ce0 | compose incluye api/app/page; configuración validada y build de app/page correcto |
| 2026-10-10 13:41 | big-pickle (infra) | INFRA-03 | PENDIENTE → EN PROGRESO | 6e09314 | red explícita y healthchecks de db/api/app/page; pendiente verificación `healthy` |
