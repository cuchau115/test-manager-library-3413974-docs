# ADR-RL-005 · Punto único de composición: puertos y adaptadores en Laravel

- **Estado:** aceptada
- **Deriva de:** Artículos **I, II y III** de la constitución
  ([`../../spec-python/constitution.md`](../../spec-python/constitution.md), idénticos en
  [`../../spec-.net/constitution.md`](../../spec-.net/constitution.md)), y de la traducción de las
  reglas de dependencia hexagonal descrita en [`../arquitectura.md`](../arquitectura.md).

## Contexto

El spec exige arquitectura hexagonal: el dominio no depende de nada (Art. I), la capa de aplicación
define sus propios puertos sin tipos de framework (Art. II) y un **único** módulo ata puertos y
adaptadores, de modo que fuera de él nadie instancia infraestructura (Art. III). En el spec de origen
ese módulo es `bootstrap/composition/port_bindings.py` (Python) o
`Library.Bootstrap/Composition/PortBindings.cs` (.NET). Laravel, en cambio, tiene su propio sistema de
*service container* y *service providers*; hay que decidir **dónde** se hace la composición sin
romper el Artículo III.

## Alternativas

1. **Resolución automática por el contenedor en cada clase** (inyectar interfaces y dejar que Laravel
   las resuelva con *auto-binding* o atributos por todas partes). Descartada: dispersa la composición
   y hace imposible verificar «un solo punto».
2. **Repositorios instanciados a mano en controladores o servicios.** Descartada: viola el Art. III;
   mete infraestructura dentro del núcleo.
3. **Fábricas de adaptadores repartidas por `Infrastructure/`.** Descartada: varios puntos de
   composición encubiertos.
4. **Un único `CompositionServiceProvider` que registra todos los bindings puerto→adaptador.**
   **Elegida.**

## Decisión

- `api/app/Providers/CompositionServiceProvider.php` es el **único punto de composición**: ahí se
  registran los bindings de las **9 interfaces** de `api/app/Application/Ports/`
  (`BookRepository`, `LoanRepository`, `MemberRepository`, `UserRepository`, `ReportReader`, `Clock`,
  `PasswordHasher`, `TokenIssuer`, `CoverStorage`) contra sus implementaciones en
  `api/app/Infrastructure/`.
- **Fuera de ese provider no se instancia infraestructura.** Los servicios de aplicación reciben los
  puertos por inyección de dependencias (constructor), nunca los construyen.
- El dominio (`api/app/Domain/`) es **PHP puro** y no conoce `Illuminate\*` (Art. I). La aplicación
  (`api/app/Application/`) no conoce `api/app/Infrastructure/` (Art. II).

## Consecuencias

- Cambiar un adaptador (por ejemplo, disco → S3 para portadas) solo toca el adaptador nuevo y **una
  línea** en la composición: no toca dominio ni aplicación (OCP, Art. IV).
- Los tests de aplicación corren con fakes de los puertos, sin base de datos ni framework.
- La regla es comprobable por pruebas de arquitectura, no por convención.

## Cómo se verifica

- `DomainIsolationTest` (`T-06.3`): `app/Domain` no importa `Illuminate\*`.
- `ApplicationIsolationTest` (`T-11.2`): `app/Application` no importa `app/Infrastructure`.
- `CompositionIsolationTest` (`T-17.1`): ninguna instanciación de un adaptador de `Infrastructure`
  fuera de `CompositionServiceProvider`.
