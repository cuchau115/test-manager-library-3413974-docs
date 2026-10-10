# Traducción del spec a React + Laravel — Manager Library

Esta carpeta es la **traducción fiel del negocio** de [`../spec-python/`](../spec-python/) y
[`../spec-.net/`](../spec-.net/) al **stack del reto**: **React 18 + Vite** en el frontend y
**PHP 8.3 + Laravel 11 + PostgreSQL 16** en el backend.

El spec original describe *el mismo producto* dos veces, una por tecnología de origen (FastAPI y
ASP.NET). Aquí se conserva **todo lo que es negocio** —actores, historias, criterios de aceptación,
reglas, requisitos no funcionales, modelo de datos y contrato HTTP— y se traduce **solo lo que es
tecnología** a Laravel y React, sin cambiar el comportamiento observable.

> **Regla de oro.** Lo que el spec dice de **negocio** se respeta literal. Lo que dice de
> **tecnología** (FastAPI/SQLAlchemy/Alembic/pytest, o ASP.NET/EF Core/xUnit) se traduce a
> **Laravel/React**. En particular, [`data-model.md`](../spec-python/data-model.md) y
> [`api-contract.md`](../spec-python/api-contract.md) se implementan **sin cambios**.

---

## 1. Qué es esta carpeta

| Documento | Para qué |
|---|---|
| [`arquitectura.md`](arquitectura.md) | Arquitectura hexagonal en Laravel; mapea los Artículos I, II y III de la constitución a carpetas reales de `api/app/`. |
| [`plan-tecnologico.md`](plan-tecnologico.md) | Decisiones tecnológicas del reto y su correspondencia con las decisiones D-01…D-12 del plan original. |
| [`mapeo-spec.md`](mapeo-spec.md) | Tabla concepto→concepto entre el spec de origen (Python/.NET) y el stack del reto. |
| [`adr/`](adr/) | ADR-RL-001…005: las decisiones de arquitectura traducidas del `adr/` original, más la del punto único de composición. |

## 2. Stack del reto

| Capa | Tecnología | Ruta en el repo |
|---|---|---|
| Frontend de operación | React 18 + Vite | `test-manager-library-3413974-app` |
| Backend / API | PHP 8.3 + Laravel 11 | `test-manager-library-3413974-api` |
| Base de datos | PostgreSQL 16 (esquema `library`) | contenedor `db` en `…-infra` |
| Autenticación | JWT HS256 (8 h) | `api/app/Infrastructure/Security` |
| Hashing | Argon2id | `api/app/Infrastructure/Security` |
| Sitio público | HTML/CSS estático (sin API) | `test-manager-library-3413974-page` |
| Sembrador de demo | Cliente que usa la API | `test-manager-library-3413974-tool` |
| Empaquetado | Docker + Docker Compose | `test-manager-library-3413974-infra` |

Un solo `docker compose up` desde `infra` deja el sistema operativo, con la base **vacía hasta
migrar** y el administrador inicial creado por el arranque de la aplicación.

## 3. Cómo se lee esta carpeta

1. Lee primero el spec original en este orden: `constitution.md` → `spec.md` → `plan.md` /
   `architecture.md` / `arquitectura-panoramica.md` → `data-model.md` y `api-contract.md` → `adr/`.
   La base elegida es [`spec-python/`](../spec-python/); si una regla de negocio difiriera de
   `spec-.net/`, gana `spec-python/` y la diferencia se anota.
2. Vuelve aquí: [`arquitectura.md`](arquitectura.md) explica **dónde** vive cada pieza en Laravel;
   [`mapeo-spec.md`](mapeo-spec.md) da la equivalencia concepto→concepto; [`plan-tecnologico.md`](plan-tecnologico.md)
   fija las decisiones tecnológicas.
3. El **negocio no se repite aquí**: vive en `spec.md`, `data-model.md` y `api-contract.md` del spec
   original, que se implementan **sin cambios**. Esta carpeta solo dice *cómo se traduce*.

## 4. Relación con los seis repositorios

| Repo | Papel | Esta carpeta le sirve para… |
|---|---|---|
| `test-manager-library-3413974-docs` | Spec + esta traducción + plan maestro | Fuente de verdad de la traducción |
| `test-manager-library-3413974-api` | Backend Laravel | [`arquitectura.md`](arquitectura.md) y [`adr/`](adr/) definen su forma |
| `test-manager-library-3413974-app` | Frontend React | [`mapeo-spec.md`](mapeo-spec.md) y el contrato congelado guían sus pantallas |
| `test-manager-library-3413974-page` | Sitio público estático | No depende de la API |
| `test-manager-library-3413974-infra` | `docker compose`, red, volúmenes, motor vacío | [`plan-tecnologico.md`](plan-tecnologico.md) §7 |
| `test-manager-library-3413974-tool` | Sembrador de demo (usa la API) | Consume el mismo contrato |

## 5. Invariantes de negocio (resumen)

El detalle vive en el spec original; aquí solo el recordatorio de lo que **no cambia** al traducir:

- Disponibles entre 0 y total; total ≥ 1.
- Un préstamo tiene de 1 a 3 líneas, sin repetir libro; cada línea descuenta 1 ejemplar.
- Vencimiento = `loaned_at + 14 días`; máximo 3 libros sin devolver por socio.
- Un socio con vencidos no puede pedir más.
- Estado del préstamo (`open`/`overdue`/`closed`) **calculado**, no almacenado.
- Lo congelado en la línea (título, ISBN, categoría) no sigue al catálogo.
- Baja lógica de libros; concurrencia optimista sobre ejemplares (testigo de versión + `CHECK ck_book_available_range`).
