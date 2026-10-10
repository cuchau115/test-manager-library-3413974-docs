# Mapeo del spec — de Python/.NET a React + Laravel

Tabla de **concepto → concepto** entre el spec de origen y el stack del reto. El objetivo es que
quien implemente en Laravel/React sepa a qué equivale cada pieza del spec de Python (`spec-python/`)
o de .NET (`spec-.net/`) **sin inventar** y **sin cambiar el negocio**.

> **Lo que NO se traduce** (se implementa igual, literal):
> [`spec.md`](../spec-python/spec.md), [`data-model.md`](../spec-python/data-model.md) y
> [`api-contract.md`](../spec-python/api-contract.md). Historias, criterios de aceptación, reglas de
> negocio, requisitos no funcionales, tablas, columnas, restricciones, rutas, cuerpos, códigos de
> estado y cuerpo de error se respetan **sin cambios de comportamiento**.

---

## 1. Mapeo tecnológico general

| Concepto | Python (spec base) | .NET (spec par) | Reto (React + Laravel) |
|---|---|---|---|
| Lenguaje backend | Python 3.12 | C# 12 / .NET 8 | PHP 8.3 |
| Framework HTTP | FastAPI | ASP.NET Core (Minimal API) | **Laravel 11** (Controllers, Requests, Resources, Middleware) |
| ORM / acceso a datos | SQLAlchemy 2 | EF Core 8 | **Eloquent 11** |
| Migraciones | Alembic | EF Core Migrations | **Laravel migrations** (`database/migrations/`) |
| Test runner | pytest | xUnit | **PHPUnit** (runner de Laravel; Pest opcional) |
| Validación de entrada | pydantic (schemas) | FluentValidation / DTOs | **Form Requests** (`Http/Requests`) |
| Serialización de salida | pydantic / response models | DTOs | **API Resources** (`Http/Resources`) |
| Inyección de dependencias | `bootstrap/composition/port_bindings.py` | `Library.Bootstrap/Composition/PortBindings.cs` | **`CompositionServiceProvider.php`** (contenedor de Laravel) |
| Autenticación | JWT HS256 | JWT HS256 | **JWT HS256** (middleware propio) |
| Hashing de contraseñas | Argon2id | BCrypt (factor 12) | **Argon2id** |
| Frontend | (no aplica) | (no aplica) | **React 18 + Vite** |
| Sitio público | (no aplica) | (no aplica) | **HTML/CSS estático** (sin API) |
| Empaquetado | (implícito) | (implícito) | **Docker + Docker Compose** |

## 2. Mapeo de arquitectura (hexagonal)

| Concepto hexagonal | Python | .NET | Reto (Laravel) |
|---|---|---|---|
| Dominio (Art. I) | `src/library/domain/` | `src/Library.Domain/` | `api/app/Domain/` |
| Casos de uso + puertos (Art. II) | `src/library/application/` | `src/Library.Application/` | `api/app/Application/` |
| Puertos | `application/ports/outbound/` | `Library.Application/Ports/` | `api/app/Application/Ports/` |
| Servicios | `application/services/` | `Library.Application/Services/` | `api/app/Application/Services/` |
| Adaptadores de entrada | `adapters/inbound/http/` | `Library.Api/` | `api/app/Http/` |
| Adaptadores de salida | `adapters/outbound/` | `Library.Infrastructure/` | `api/app/Infrastructure/` |
| Punto único de composición (Art. III) | `bootstrap/composition/port_bindings.py` | `Library.Bootstrap/Composition/PortBindings.cs` | `api/app/Providers/CompositionServiceProvider.php` |
| Contrato de imports | `import-linter` + `tests/architecture/` | NetArchTest | test de arquitectura en PHPUnit |

## 3. Mapeo de artefactos HTTP

| Artefacto del contrato | Origen | Reto (Laravel) |
|---|---|---|
| Router / rutas | routers FastAPI | `api/routes/api.php` (grupo `/api/v1`) |
| Controlador | `APIRouter` | `Http/Controllers` |
| Validación de entrada | pydantic models | `Http/Requests` |
| Cuerpo de respuesta | pydantic response models | `Http/Resources` |
| Middleware de auth/rol | dependency FastAPI | `Http/Middleware` |
| Cuerpo de error único `{code,message,details}` | exception handlers | Handler de excepciones + mapeo de errores de dominio |
| Paginación `{items,page,size,total}` | schema pydantic | Resource de colección |

## 4. Mapeo de modelo de datos y objetos de valor

| Concepto | Origen | Reto (Laravel / PostgreSQL) |
|---|---|---|
| Tablas y columnas | `data-model.md` (idéntico en ambos) | Migración Laravel **sin cambios** |
| `category`,`book`,`member`,`loan`,`loan_item`,`user` | 6 tablas | 6 tablas en el esquema `library` |
| Objetos de valor (`Isbn`, `Quantity`, `DateRange`) | clases del dominio | clases PHP puras en `api/app/Domain` |
| Enums (`Role`, estado de préstamo calculado) | enums + lógica de dominio | enum PHP `Role` + estado calculado (sin columna) |
| Semilla de 5 categorías con UUID fijos | migración inicial | `database/migrations/` |
| `CHECK`, `UNIQUE`, FK e índice parcial de ISBN | restricciones del motor | mismas restricciones en la migración |

## 5. Mapeo de decisiones de arquitectura

| ADR de origen | ADR-RL del reto |
|---|---|
| `adr-001-propiedad-del-esquema.md` | [`adr/adr-rl-001-propiedad-del-esquema.md`](adr/adr-rl-001-propiedad-del-esquema.md) |
| `adr-002-concurrencia-optimista.md` | [`adr/adr-rl-002-concurrencia-optimista.md`](adr/adr-rl-002-concurrencia-optimista.md) |
| `adr-003-baja-logica.md` | [`adr/adr-rl-003-baja-logica.md`](adr/adr-rl-003-baja-logica.md) |
| `adr-004-reporte-agregado-y-congelado.md` | [`adr/adr-rl-004-reporte-agregado-y-congelado.md`](adr/adr-rl-004-reporte-agregado-y-congelado.md) |
| (nuevo: Artículos I–III en Laravel) | [`adr/adr-rl-005-composicion-puertos-y-adaptadores.md`](adr/adr-rl-005-composicion-puertos-y-adaptadores.md) |

## 6. Mapeo de pruebas

| Nivel | Origen | Reto |
|---|---|---|
| Dominio | pytest / xUnit | PHPUnit (dominio puro) |
| Aplicación | pytest con fakes | PHPUnit con fakes de los puertos |
| Integración | pytest + PostgreSQL | PHPUnit + PostgreSQL real |
| Contrato | pytest + API levantada | PHPUnit + API levantada |
| Arquitectura | import-linter / NetArchTest | PHPUnit (test de imports prohibidos) |
| Concurrencia | prueba simultánea | PHPUnit + peticiones simultáneas |

## 7. Lo que se implementa SIN cambios de comportamiento

- **`spec.md`:** actores, HU-01…HU-10, CA-01.1…CA-10.5, RN-1…RN-6, RNF-1…RNF-5.
- **`data-model.md`:** tablas, columnas, tipos, nulabilidad (sin `DEFAULT`), restricciones, índices,
  política de FKs, semilla de categorías y reglas de privacidad/retención.
- **`api-contract.md`:** base `/api/v1`, `snake_case`, UUID como texto, fechas ISO-8601 UTC con `Z`,
  cuerpo de error único, códigos de estado y códigos de error de negocio, y todos los endpoints.

Cualquier cambio en estos tres documentos es una **contradicción con el spec**, no una traducción.
