# ADR-RL-006 · El `api` acepta `loaned_at` opcional solo en entorno local para sembrar vencidos

- **Estado:** aceptada
- **Deriva de:** la decisión abierta nº 1 de [`../../AGENTS.md`](../../AGENTS.md) §11 y de
  [`../../spec-python/api-contract.md`](../../spec-python/api-contract.md) §3.6 (`POST /loans`,
  `due_at = loaned_at + 14 días`, CA-06.6).

## Contexto

El sembrador de demostración (`tool`, tareas `TOOL-01…TOOL-04`) debe dejar el sistema con **15
préstamos y 3 vencidos** para que `GET /loans/overdue` devuelva 3 líneas y el reporte tenga filas. La
regla dura nº 3 de [`../../AGENTS.md`](../../AGENTS.md) §1 y la definición de `TOOL` («sembrador
**por la API**») exigen que el `tool` use la API, **sin SQL directo** contra PostgreSQL.

El problema es que el contrato fija `loaned_at = ahora` y **`due_at = loaned_at + 14 días`**
(CA-06.6): un préstamo recién creado nunca está vencido, así que por el contrato de producción es
**imposible** generar vencidos de forma retroactiva. El `tool` necesita que la fecha del préstamo sea
**anterior** a «hoy − 14 días» para que la línea quede vencida.

## Alternativas

1. **Endpoint *dev-only* de sembrado.** Un `POST /dev/seed` que inserta préstamos con fechas
   arbitrarias. Descartada: duplica la lógica de negocio en un camino paralelo que no pasa por el
   caso de uso real, y crea una superficie de escritura privilegiada que hay que blindar aparte.
2. **Endpoint dedicado de fechas.** Un `PATCH /loans/{id}` o similar que reescriba `loaned_at`/`due_at`
   a posteriori. Descartada: introduce una operación que en producción sería un agujero (fechas de
   negocio mutables) y obliga a protegerla con el mismo tipo de guarda que la opción elegida, pero
   con más código.
3. **Permitir SQL directo en `tool`.** Descartada de raíz: viola la definición de `TOOL` («usa la
   API») y la regla dura nº 7; además esquiva los invariantes del dominio (congelado de la línea,
   descuento de ejemplares, tope de 3 sin devolver, socio con vencidos).
4. **Parámetro opcional `loaned_at` en `POST /loans`, aceptado solo con `APP_ENV=local`.**
   **Elegida** (decisión confirmada en [`../../AGENTS.md`](../../AGENTS.md) §11).

## Decisión

1. `POST /loans` acepta un campo **opcional** `loaned_at` (ISO-8601 UTC con `Z`) en el cuerpo.
2. El `api` **solo lo honra cuando `APP_ENV=local`**. Con cualquier otro entorno (`production`,
   `staging`, `testing`), el campo se **ignora** (o se rechaza con 422 `VALIDATION_ERROR`); en ningún
   caso cambia el comportamiento.
3. El préstamo se sigue creando **por el mismo caso de uso** (`LendBooksService`, `T-09.1`): se
   respetan todos los invariantes (1..3 líneas sin repetir libro, tope de 3 sin devolver por socio,
   socio sin vencidos, descuento de ejemplares, congelado de título/ISBN/categoría). Lo único que
   cambia es el instante de origen con el que el dominio calcula `due_at = loaned_at + 14 días`.
4. **El contrato de producción no cambia:** `api-contract.md` §3.6 sigue igual; `loaned_at` es un
   parámetro **fuera del contrato**, disponible solo en local para el sembrador.
5. El `tool` (`TOOL-03`) usa este parámetro para crear los préstamos de los 3 vencidos con fechas
   anteriores a «hoy − 14 días», y crea el resto de préstamos en fecha corriente.

## Consecuencias

- El `tool` permanece **cliente puro de la API** (regla dura nº 7): no abre conexión a PostgreSQL ni
  ejecuta SQL.
- La puerta a fechas retroactivas queda **acotada por entorno**: no existe en producción, por lo que
  no hay riesgo de manipular fechas de negocio reales.
- La superficie añadida es mínima (un campo opcional condicionado por entorno) frente a un endpoint
  nuevo; se evita duplicar el caso de uso de préstamo.
- Debe existir una prueba de que en entorno no-local el parámetro no altera `loaned_at` (y/o se
  rechaza), y de que en local el dominio sigue calculando `due_at = loaned_at + 14 días`.

## Cómo se verifica

- `TOOL-03`: tras correr el sembrador, `GET /loans/overdue` devuelve **3 líneas** y el reporte
  `GET /reports/most-borrowed` tiene filas.
- Con `APP_ENV=production`, `POST /loans` con `loaned_at` produce un préstamo con `loaned_at = ahora`
  (el campo no tiene efecto), verificable por prueba de contrato.
- Los invariantes del préstamo (tope de 3, sin repetidos, socio con vencidos) siguen vigentes en
  entorno local: los vencidos se sembrarán sobre socios distintos o tras devoluciones para no
  chocar con el límite.
