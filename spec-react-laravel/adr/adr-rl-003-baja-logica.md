# ADR-RL-003 · Los libros se dan de baja, no se borran

- **Estado:** aceptada
- **Deriva de:** [`../../spec-python/adr/adr-003-baja-logica.md`](../../spec-python/adr/adr-003-baja-logica.md)
  (idéntico en [`../../spec-.net/adr/adr-003-baja-logica.md`](../../spec-.net/adr/adr-003-baja-logica.md)).

## Contexto

Una línea de préstamo (`loan_item`) apunta a un libro. Si el libro se borra físicamente, el historial
y el reporte quedan rotos. En el reto, Eloquent ofrece *soft deletes*, pero el esquema (propiedad de
las migraciones, ADR-RL-001) ya define la columna `book.deleted_at`.

## Alternativas

1. **Borrado físico con cascada.** Descartada: destruye el histórico de préstamos.
2. **Marcar `active = false`.** Descartada: no dice **cuándo** se dio de baja.
3. **Baja lógica con `deleted_at`.** **Elegida.**

## Decisión

El libro lleva `deleted_at`. Dar de baja lo llena (nunca se hace `DELETE`). El catálogo filtra por
`deleted_at IS NULL` en un **único lugar** (filtro global). Un libro con préstamos abiertos **no** se
da de baja: responde **409 `BOOK_HAS_OPEN_LOANS`**. La unicidad del ISBN es un **índice parcial**
sobre libros activos (`WHERE deleted_at IS NULL`), así un ISBN dado de baja puede volver a
registrarse.

## Consecuencias

- `loan_item.book_id` lleva una FK **RESTRICT** como **barrera de última instancia**: un `DELETE`
  manual o un cambio de código futuro fallan ruidosamente en vez de corromper el histórico (FK-3 de
  [`../../spec-python/data-model.md`](../../spec-python/data-model.md) §5).
- Consultar un libro dado de baja devuelve **404** (CA-04.3).
- El binario de la portada es el **único** dato que sí se borra físicamente.

## Cómo se verifica

Consultar un libro dado de baja devuelve 404; un `DELETE` por `psql` sobre un libro con líneas falla
por la FK; un ISBN dado de baja puede volver a registrarse (tareas `T-08.4`, `T-02.2`).
