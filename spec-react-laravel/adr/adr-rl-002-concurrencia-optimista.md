# ADR-RL-002 · Concurrencia optimista sobre los ejemplares

- **Estado:** aceptada
- **Deriva de:** [`../../spec-python/adr/adr-002-concurrencia-optimista.md`](../../spec-python/adr/adr-002-concurrencia-optimista.md)
  (idéntico en [`../../spec-.net/adr/adr-002-concurrencia-optimista.md`](../../spec-.net/adr/adr-002-concurrencia-optimista.md)).

## Contexto

Dos bibliotecarios pueden prestar el **último ejemplar** del mismo libro al mismo tiempo (RNF-2). Si
ambos leen `available_copies = 1` y ambos escriben, el sistema presta un libro que no tiene. En el
reto, la persistencia es Eloquent sobre PostgreSQL 16.

## Alternativas

1. **Bloqueo pesimista de la fila** (`SELECT … FOR UPDATE`) en cada préstamo. Descartada: serializa
   toda la biblioteca por un caso raro.
2. **Contador en memoria.** Descartada: no sobrevive a más de un proceso (la API puede escalar).
3. **Control de concurrencia optimista** con testigo de versión + `CHECK`. **Elegida.**

## Decisión

El libro lleva un **testigo de versión** (`version`). Al guardar, el adaptador ejecuta un
`UPDATE book … WHERE id = :id AND version = :leida`; si la versión cambió, la operación falla y el
servidor responde **409 `BOOK_NOT_AVAILABLE`** (o reintenta una vez si el ejemplar sigue disponible).
La **última barrera** es el `CHECK` `ck_book_available_range`
(`0 <= available_copies <= total_copies`).

## Consecuencias

- Si el `CHECK` salta, **algo escribió fuera del adaptador**: es un defecto, no un caso de negocio.
- Devolver dos veces la misma línea no suma dos veces porque `returned_at` ya está lleno (CA-07.2).
- Los disponibles nunca superan el total: lo garantiza el motor (RN-1, Artículo VI).

## Cómo se verifica

Prueba concurrente con dos peticiones simultáneas sobre un libro con un solo ejemplar: exactamente
una recibe **201** y la otra **409** (RNF-2, tarea `T-13.2`).
