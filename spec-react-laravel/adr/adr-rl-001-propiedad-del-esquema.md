# ADR-RL-001 · El esquema es propiedad de las migraciones de la aplicación

- **Estado:** aceptada
- **Deriva de:** [`../../spec-python/adr/adr-001-propiedad-del-esquema.md`](../../spec-python/adr/adr-001-propiedad-del-esquema.md)
  (idéntico en [`../../spec-.net/adr/adr-001-propiedad-del-esquema.md`](../../spec-.net/adr/adr-001-propiedad-del-esquema.md)).

## Contexto

El repositorio `infra` levanta un motor de base de datos. Alguien podría poner el DDL en un script de
arranque del contenedor del motor y otro en las migraciones de la aplicación; con dos dueños, nadie
sabe qué esquema corre en producción. En el reto, el motor es **PostgreSQL 16** con esquema `library`
y las migraciones son **Laravel migrations** (`api/database/migrations/`).

## Alternativas

1. **Scripts SQL en `infra/db/init/`** para crear tablas al arrancar el contenedor. Descartada: es una
   segunda fuente de verdad, invisible para las migraciones de la aplicación.
2. **ORM en modo «crear tablas al arrancar»** (por ejemplo, generar el esquema desde los modelos
   Eloquent). Descartada: no deja historial ni reversa, y el esquema no sería reproducible.
3. **Todo el DDL en las migraciones de la aplicación** (`api/database/migrations/`), con `infra`
   levantando solo el motor vacío. **Elegida.**

## Decisión

**Todo el DDL vive en las migraciones de Laravel** (tablas, índices, restricciones y semilla de las
5 categorías). `infra` solo crea el motor vacío, el usuario y el volumen. No hay `CREATE TABLE` fuera
de `api/database/migrations/`.

## Consecuencias

- Una extensión de Postgres, un índice parcial o un `CHECK` nuevo se declara en la **misma** migración
  que lo usa (por ejemplo, `ck_book_available_range`, el índice parcial de ISBN sobre activos, etc.).
- Un esquema cambiado a mano en el motor es un **defecto**, no una variante: la migración es la única
  dueña del esquema.
- La base arranca **vacía** hasta migrar (RNF-5, Artículo V).

## Cómo se verifica

- `infra` no contiene `CREATE TABLE`.
- Las consultas de [`../../spec-python/data-model.md`](../../spec-python/data-model.md) §10 coinciden
  con lo que dejan las migraciones.
