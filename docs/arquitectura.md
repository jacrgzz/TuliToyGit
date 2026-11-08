# Arquitectura de software (aprobada 8 nov 2026)

Módulos por feature, sin capas de repositorios ni casos de uso. Supabase ya aporta la parte difícil: RLS es la capa de autorización y SQL la capa de análisis.

## Estructura

```
apps/web/src/
  app/                     rutas delgadas: solo componen, sin lógica
    (marketing)/           landing
    (auth)/                login, registro
    (dashboard)/           padre, docente, dispositivos
    api/ingest/route.ts    delega a features/ingest
  features/
    ingest/                el IoT entra por aquí
    auth/
    children/
    events/                pulsaciones y su contexto
    readings/              lecturas de la caja
    devices/               estado y tokens
    insights/              patrones
  lib/
    supabase/              server.ts, browser.ts, admin.ts
    thresholds.ts          umbrales del semáforo
    database.types.ts      generado con `supabase gen types`
```

Otras carpetas del repo: `supabase/` (migraciones, seed), `tools/simulator/`, `firmware/`, `docs/`.

Cada feature tiene como máximo:

```
features/<nombre>/
  queries.ts     lecturas (servidor, con el cliente del usuario)
  actions.ts     escrituras (server actions)
  schemas.ts     zod
  components/    UI de esta feature
```

## Reglas

1. **Dependencia en un solo sentido:** `app → features → lib`. Una feature no importa el interior de otra; usa su `queries.ts`.
2. **La seguridad vive en la base de datos.** Las lecturas usan el cliente del usuario y RLS decide qué ve. El cliente `admin` (`service_role`) existe solo en `features/ingest`.
3. **El análisis vive en SQL.** `event_context` y los patrones son vistas o funciones en las migraciones; TypeScript solo las consulta y las muestra.

## Flujo del IoT

```
ESP32 / simulador -> api/ingest/route.ts -> features/ingest/handle.ts
  1. verifica el token del dispositivo (hash)
  2. valida con zod (schemas.ts = contrato v1)
  3. inserta con el cliente admin
  4. escribe en ingest_log (aceptado o rechazado, con motivo)
```

`features/ingest/schemas.ts` es la **única definición del contrato en código**. El simulador (`tools/simulator`), las pruebas y el endpoint importan ese mismo archivo para que no se desincronicen. Si un dispositivo real falla, se compara su mensaje con ese esquema y con el `ingest_log`.

## Tiempo real

El hook de Realtime vive dentro de la feature que lo usa (por ejemplo `features/events/components/`), no en un lugar global.

## Pruebas (solo lo que protege el IoT y la privacidad)

- `vitest`: esquema del contrato y umbrales.
- Políticas RLS: el padre A no ve datos del padre B; el docente ve su salón.
- Sin pruebas de interfaz esta semana.

## Por qué no Clean Architecture

Para Tuli sobra: 2 a 4 archivos por funcionalidad en lugar de 8 o más, ubicación predecible (`features/<nombre>`) y menos contexto por tarea. No hay necesidad de cambiar de base de datos que justifique las capas.

## Decisión pendiente

`tools/simulator` fuera de `apps/web` (más ordenado, requiere configurar la importación del esquema) frente a dentro (comparte tipos sin configuración). Por defecto: `tools/`.
