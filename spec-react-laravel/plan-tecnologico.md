# Plan tecnológico — Manager Library (React + Laravel)

Cómo se construye lo que dicen [`../spec-python/spec.md`](../spec-python/spec.md) y
[`../spec-python/constitution.md`](../spec-python/constitution.md), traducido al **stack del reto**.
El esquema **no** se describe aquí: vive en
[`../spec-python/data-model.md`](../spec-python/data-model.md) y se implementa sin cambios. La forma
del sistema, en [`arquitectura.md`](arquitectura.md).

La numeración **D-01…D-12** es la del [`../spec-python/plan.md`](../spec-python/plan.md): cada
decisión del spec de origen se conserva y se traduce a la tecnología del reto (Laravel/React). Cuando
una decisión no aplica literal (por ejemplo, el ORM), se indica su equivalente.

---

## 1. Decisiones tecnológicas (D-01…D-12)

| # | Decisión (origen) | Elección del reto (React + Laravel) | Equivalencia / por qué |
|---|---|---|---|
| D-01 | Lenguaje y runtime | **PHP 8.3** (backend) y **JavaScript moderno con React 18** (frontend) | Sustituye a Python 3.12. El negocio no cambia. |
| D-02 | Framework HTTP | **Laravel 11** (routing + controllers + middleware) | Sustituye a FastAPI. El contrato en [`../spec-python/api-contract.md`](../spec-python/api-contract.md) se respeta igual. |
| D-03 | Persistencia | **Eloquent 11** + **migraciones de Laravel** sobre **PostgreSQL 16** | Sustituye a SQLAlchemy 2 + Alembic. El esquema sigue siendo de las migraciones ([ADR-RL-001](adr/adr-rl-001-propiedad-del-esquema.md)). |
| D-04 | Concurrencia | Testigo de versión por libro + `CHECK ck_book_available_range` ([ADR-RL-002](adr/adr-rl-002-concurrencia-optimista.md)) | Idéntico: UPDATE condicionado por `version`; conflicto → 409 `BOOK_NOT_AVAILABLE` (RNF-2). |
| D-05 | Fechas | Instantes UTC (`timestamptz`); el reloj es un puerto (`Clock`) | Idéntico: permite probar vencimientos sin esperar 14 días. |
| D-06 | Reporte | Una consulta agregada por un puerto de lectura (`ReportReader`) ([ADR-RL-004](adr/adr-rl-004-reporte-agregado-y-congelado.md)) | Idéntico: estable y barato; agrupa por valores congelados. |
| D-07 | Objetos de valor | `Isbn`, `Quantity`, `DocumentNumber`, `DateRange`: viven dentro de la fila de su dueño, sin tabla | Idéntico: no tienen identidad propia. |
| D-08 | Portadas | Binario en almacenamiento externo (disco en local, S3 en producción); la base guarda solo `cover_key` | Idéntico: clave opaca, nunca ruta ni bytes; la base guarda `cover_key` (nulable). |
| D-09 | Contraseñas | **Argon2id** detrás del puerto `PasswordHasher`; el dominio nunca ve la clave en claro | Sustituye a BCrypt del spec .NET y al hash del spec Python. Artículo IX. |
| D-10 | Arranque | La aplicación crea el admin inicial desde `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Idéntico: la base no puede producir el hash; lo hace el arranque del contenedor. |
| D-11 | Autenticación | **JWT HS256**, 8 horas, clave en `JWT_SECRET`, con `sub` + `role` | Idéntico al spec de origen. |
| D-12 | Pruebas | **PHPUnit** (runner de Laravel; Pest permitido) con fakes de los puertos y PostgreSQL real solo en integración | Sustituye a pytest / xUnit. Misma pirámide de pruebas. |

### Detalle de los puntos pedidos

- **Framework HTTP:** Laravel 11, con grupos de rutas bajo `/api/v1` (`api/routes/api.php`),
  `Controllers`, `Requests` (validación de entrada) y `Resources` (serialización de salida).
- **ORM:** Eloquent 11. Los modelos viven en `api/app/Infrastructure/Persistence` y los repositorios
  que implementan los puertos traducen dominio ↔ modelo. El dominio **no** conoce Eloquent (Art. I).
- **Migraciones:** **Laravel migrations** (`api/database/migrations/`). Ahí vive **todo** el DDL
  (tablas, índices, FKs, `CHECK`) y la semilla de las 5 categorías. `infra` levanta el motor vacío
  ([ADR-RL-001](adr/adr-rl-001-propiedad-del-esquema.md)).
- **Test runner:** **PHPUnit** como runner base de Laravel (`php artisan test`). Cubre dominio,
  aplicación (con fakes), integración contra PostgreSQL real, contrato, arquitectura y concurrencia.
- **Autenticación:** **JWT HS256**, vigencia 8 h (`expires_in` = 28800), firmado con `JWT_SECRET`;
  el token lleva `sub` y `role`, sin datos personales. Middleware de auth + autorización por rol.
- **Hashing:** **Argon2id** detrás del puerto `PasswordHasher`. Se guarda solo `password_hash`; nunca
  sale en respuestas ni en logs.
- **Almacenamiento de portadas:** `CoverStorage` en disco (`COVERS_DIR` en local). La base guarda una
  **clave opaca**; el binario se sirve aparte. Validación por contenido (JPG/PNG, ≤ 2 MB).
- **Serialización:** `Resources` de Laravel que producen **`snake_case`**, UUID como texto, fechas
  ISO-8601 UTC con `Z`, y paginación `{ items, page, size, total }`. Cuerpo de error único
  `{ code, message, details }`.
- **Contenedores:** **Docker + Docker Compose** desde `infra`. PHP 8.3-fpm + nginx para la API, build
  estático para React, postgres:16 para la base, nginx para el sitio público. Un solo
  `docker compose up`.

## 2. Correspondencia con el plan original

| Decisión original (Python / .NET) | Decisión del reto |
|---|---|
| D-01 Python 3.12 / .NET 8 | PHP 8.3 + React 18 |
| D-02 FastAPI / ASP.NET Core | Laravel 11 |
| D-03 SQLAlchemy+Alembic / EF Core | Eloquent + Laravel migrations |
| D-04 Concurrencia optimista | igual (versión + `CHECK`) |
| D-05 Fechas UTC + `Clock` | igual |
| D-06 Reporte por puerto de lectura | igual (`ReportReader`) |
| D-07 Objetos de valor sin tabla | igual |
| D-08 Portadas por clave opaca | igual (`cover_key`) |
| D-09 Argon2id / BCrypt | **Argon2id** |
| D-10 Admin inicial por entorno | igual |
| D-11 JWT HS256 8 h | igual |
| D-12 pytest / xUnit | PHPUnit |

## 3. Configuración por entorno

Idéntica a la del plan original. Ningún secreto entra al repositorio: solo se versiona `.env.example`.

| Variable | Obligatoria | Ejemplo |
|---|---|---|
| `DATABASE_URL` | sí | `postgresql://library:library@db:5432/library` |
| `JWT_SECRET` | sí | cadena larga aleatoria |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | sí | definidos en `.env`, nunca en el repo |
| `COVERS_DIR` | no | `./var/covers` |
| `CORS_ORIGIN` | sí | `http://localhost:5173` |
| `APP_URL` | sí | `http://localhost:8000` |

## 4. Estrategia de pruebas

| Nivel | Qué prueba | Contra qué | Herramienta del reto |
|---|---|---|---|
| Dominio | Invariantes: máximo 3, vencimiento a 14 días, disponibles en rango | Nada: objetos puros | PHPUnit |
| Aplicación | Casos de uso: prestar, devolver, reporte | Fakes de los puertos | PHPUnit |
| Integración | Repositorios y consulta del reporte | PostgreSQL real | PHPUnit |
| Contrato | Cuerpo de error único y códigos de estado | La API levantada | PHPUnit |
| Arquitectura | Artículos I, II y III | Test que prohíbe imports prohibidos | PHPUnit |
| Concurrencia | Dos préstamos del último ejemplar | PostgreSQL real | PHPUnit + peticiones simultáneas |

## 5. Orden de construcción

Esqueleto y salud → migración inicial con semilla → dominio → casos de uso con fakes → adaptadores →
API → pruebas de contrato y concurrencia. El detalle, con evidencia, está en el tablero §9 del
[`../AGENTS.md`](../AGENTS.md).
