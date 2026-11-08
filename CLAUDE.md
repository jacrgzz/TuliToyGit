# Tuli Toy: Not A Regular Toy

Sistema IoT (juguete fidget + caja multisensor) y una PWA que muestra qué condiciones del ambiente (ruido, luz, temperatura, humedad) preceden los momentos de nerviosismo, ansiedad o miedo de un niño. Para padres/tutores y docentes.

**Tuli no diagnostica ni trata nada.** Solo muestra coincidencias entre condiciones y eventos. Todo texto de la interfaz debe respetarlo (nunca "detectamos ansiedad", sí "estas condiciones coincidieron con los eventos").

Contexto histórico completo (objetivos, cronograma, hardware original): `docs/contexto-original-2026-10-15.md`. Si algo de ese archivo contradice a este o al código, gana este archivo; si contradice al código, gana el código. Señala la diferencia y pregunta.

## Estado actual (8 nov 2026)

- Sprint de 1 semana para tener **demo** de landing + login + dashboard. Trabaja una sola persona (Lucy) con Claude Code.
- El **IoT no está listo**: la demo usa datos **simulados**. El firmware real de los ESP32 queda fuera de esta semana y se integrará después con el mismo contrato (`docs/contrato-datos.md`).
- Plan día por día: `docs/plan-semana.md`.
- Supabase: proyecto **nuevo** (el anterior se abandona porque su contraseña se subió a git).

## Nombres

Nombre vigente: **Tuli**. En la UI y el código nuevo usa solo "Tuli". Antes: Tilo / Not-A-Regular-Toy / `tilo-*` (el PDF de marca todavía dice "Tilo"). Todos son el mismo proyecto. Los dispositivos de prueba se llaman `tuli-toy-01` y `tuli-box-01`.

## Stack

| Capa | Tecnología |
| --- | --- |
| Web + API | Next.js (App Router) + TypeScript, en `apps/web` |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| Validación | zod |
| Datos y auth | Supabase (Postgres, Auth, Realtime), migraciones con Supabase CLI en `supabase/migrations` |
| PWA | Manifest + íconos (instalable). Sin service worker a propósito: no se cachea nada offline porque los datos de los niños son sensibles |
| Despliegue | Vercel |
| Simulador | Node + TypeScript en `tools/simulator` |
| Firmware | Arduino/PlatformIO en `firmware/` (después de la demo) |

Decisiones tomadas (no reabrir sin motivo):
- Monolito modular; sin microservicios.
- **Sin Database Webhooks.** La correlación es una vista/función SQL (`event_context`) calculada al consultar.
- Los dispositivos envían a `POST /api/ingest` con token por dispositivo. Nunca directo a Supabase y nunca con claves de Supabase en el firmware.
- Español únicamente (sin i18n).
- Fuera de alcance esta semana: notificaciones push, "machine learning" (solo estadística en SQL), sensores extra (SCD41, mmWave, AS7341, SGP41), RTC.

## Estructura del repo

```
apps/web          Next.js: src/app (rutas delgadas), src/features/<nombre>, src/lib
supabase          migraciones SQL, seed, políticas RLS
tools/simulator   simulador de juguete y caja
firmware          toy/ y box/ (después de la demo)
docs              arquitectura, contrato de datos, plan, investigación, privacidad
.claude/skills    skills del proyecto
```

### Arquitectura (detalle en `docs/arquitectura.md`)

Módulos por feature, sin repositorios ni casos de uso (no usar Clean Architecture). Cada feature en `src/features/<nombre>/` tiene como máximo `queries.ts`, `actions.ts`, `schemas.ts` y `components/`. Features: `ingest`, `auth`, `children`, `events`, `readings`, `devices`, `insights`.

Reglas:
1. Dependencia en un solo sentido: `app → features → lib`. Una feature no importa el interior de otra.
2. La seguridad vive en la base de datos (RLS). Las lecturas usan el cliente del usuario; el cliente `admin` (`service_role`) existe solo en `features/ingest`.
3. El análisis vive en SQL (vistas/funciones en migraciones); TypeScript solo consulta y muestra.

Ingesta: `api/ingest/route.ts` es delgada y delega a `features/ingest/handle.ts` (verifica token → valida con zod → inserta → escribe en `ingest_log`). `features/ingest/schemas.ts` es la **única definición del contrato en código**; el simulador y las pruebas la importan. Tipos de BD generados en `src/lib/database.types.ts`.

Comandos (ejecutar dentro de `apps/web`): `npm run dev` (http://localhost:3000), `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (vitest).

Simulador y datos de demo (ejecutar dentro de `tools/simulator`; carga `apps/web/.env.local`): `npm run provision` (crea salón, niños, 3 usuarios `padre1@tuli.test`, `padre2@tuli.test`, `docente@tuli.test` y dispositivos con tokens nuevos; escribe tokens y `DEMO_PASSWORD` en `.env.local` sin imprimirlos), `npm run simulate` (`-- --backfill 120` para historia, `-- --interval 5` para ritmo), `npm run check-rls` (verifica las políticas con usuarios demo), `npm run link -- correo@gmail.com guardian|teacher` (vincula una cuenta real a los datos demo; ver `docs/google-login.md`).

Verificación de punta a punta (con `npm run dev` corriendo y datos provisionados), desde `tools/simulator`: `npm run check-pages` (páginas del dashboard como cada usuario demo, incluido que un tutor no abra datos ajenos) y `npm run check-realtime` (Realtime respeta RLS; hay que esperar ~1.5 s tras suscribirse antes de insertar).

Rutas del dashboard: `/dashboard` (docente: panel del salón; tutor con un niño: redirige), `/dashboard/ninos/[id]` (condiciones ahora, patrones, momentos), `/dashboard/eventos/[id]` (contexto de 5 min). Vistas SQL: `event_context`, `event_summary`; función `child_patterns` (migración `resumen_y_patrones`). Umbrales y parámetros de patrones en `lib/thresholds.ts`. El lint prohíbe `Date.now()` dentro de componentes: usar los helpers de `lib/format.ts`.

Superusuario (admin, **solo lectura**): una fila en `public.admins`, que solo `service_role` puede crear: `npm run link -- correo@gmail.com admin` (en `tools/simulator`; la persona debe haber iniciado sesión antes). `is_admin()` está incluida en `can_view_child` / `can_view_classroom`, por eso ve todos los niños, salones, dispositivos, eventos, lecturas, perfiles (con correo), vínculos y `ingest_log`. Nadie puede ascenderse a sí mismo y el admin no puede escribir ni leer `token_hash`. `/dashboard` le muestra el panel de administración (resumen, salones y niños con enlace a cada vista, dispositivos en línea/sin señal, usuarios, registro de ingesta); `/dashboard/salones/[id]` es la vista del docente. Cuenta demo: `admin@tuli.test`. No poner correos en el código.

Con Cache Components + Partial Prefetching, `lib/supabase/server.ts` llama `await connection()` porque supabase-js usa `Date.now()`; sin eso `next dev` reporta "unstable value Date.now()". En tablas con permisos por columna (`devices`) no usar `select("*")`.

Modo demo (`DEMO_MODE=true` en el servidor; **apagarlo en producción real**): `/demo` es una página donde el teléfono hace de juguete (botón) y de caja (micrófono = solo nivel de ruido, nunca audio; sliders de luz, temperatura y humedad). Usa server actions en `features/ingest/demo-actions.ts` con los dispositivos `tuli-toy-demo` y `tuli-box-demo` (provisionados); exige sesión y que RLS deje ver el dispositivo. `npm run check-demo` (en `tools/simulator`) lo prueba.

Login: Google vía Supabase (`/login`, callback en `/auth/callback`) más un formulario de correo y contraseña **solo** para las cuentas demo. Hay que activar Google en Supabase una vez (`docs/google-login.md`). La vista del dashboard (docente o tutor) se decide por los datos vinculados (`teacher_classrooms`), no por `profiles.role`. Con Cache Components, todo componente que lea cookies o datos del usuario va dentro de `<Suspense>`. La sesión se refresca en `src/proxy.ts`. Requiere `SUPABASE_SERVICE_ROLE_KEY` y `npm run dev` corriendo. No leas ni imprimas esos valores de `.env.local`.

Supabase (ejecutar desde la **raíz** del repo, CLI v3). En v3 los comandos apuntan por defecto a una BD **local en Docker** (no la usamos); para el proyecto real **siempre agrega `--remote`**: `npx supabase migration new <nombre>`, `npx supabase migration list --remote`, `npx supabase db push --remote`, `npx supabase gen types --lang=typescript --remote > apps/web/src/lib/database.types.ts`. El proyecto ya está enlazado (`ngtcqkwjnacazgzjeikl`, nombre `tulitoy`).

MCP de Supabase (`.mcp.json`, limitado a este proyecto): úsalo para inspeccionar tablas, SQL de solo lectura, logs y `get_advisors`. **Las migraciones se aplican con el CLI, nunca con `apply_migration` del MCP.**

Skills del proyecto: `nueva-migracion`, `cambio-contrato` (cualquier cambio a lo que envían los dispositivos), `verificar-feature` (antes de dar algo por terminado), `marca-tuli` (textos y estilo).

**Next.js 16 (versión nueva, no la que conoces):** antes de escribir código de Next, lee la guía relevante en `apps/web/node_modules/next/dist/docs/` (ver `apps/web/AGENTS.md`). Hay "Cache Components" y "Partial Prefetching" activos; `middleware` ahora puede llamarse `proxy`. Verifica en la doc en vez de asumir.

Entorno: `apps/web/.env.local` ya tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave publishable del proyecto nuevo). `SUPABASE_SERVICE_ROLE_KEY` la pega Lucy a mano; Claude no debe leer ni pedir ese valor. Proyecto Supabase: `ngtcqkwjnacazgzjeikl`.

## Pruebas obligatorias (puerta de calidad)

**Ninguna funcionalidad se da por terminada sin `npm run verify:all` en verde** (desde `apps/web`; usa la skill `verificar-feature`). `npm run verify` = estático (secretos, typecheck, lint, pruebas unitarias, build, secretos en el bundle); `npm run verify:live` = contra Supabase (ingesta, RLS, páginas por rol, Realtime, demo, migraciones sincronizadas, lint de la BD); `verify:all` = ambos y levanta `npm run dev` solo. Primera vez: `npm run provision` y `npm run simulate -- --backfill 60 --no-live` en `tools/simulator`. Catálogo completo, pruebas por tipo de cambio, lista manual y huecos conocidos: `docs/pruebas.md`.

Reglas: (1) una funcionalidad nueva **debe traer su prueba automática** (esquema → `check-rls.ts`; contrato → `schemas.test.ts` y `check-ingest.mjs`; página → `check-pages.mjs`); (2) si algo falla se arregla y se vuelve a correr, no se explica; (3) al cerrar, decir qué se corrió y qué no; (4) no leer ni imprimir `.env*` (los scripts leen sus valores sin mostrarlos). Pruebas unitarias con `vitest` para el contrato y la hora; el resto son scripts `check-*` en `tools/simulator` y `tools/verify`.

## Modelo de datos (resumen; detalle en `docs/contrato-datos.md`)

`profiles` (role: `guardian` | `teacher`), `classrooms`, `children`, `guardians` (padre↔niño), `teacher_classrooms` (docente↔salón), `devices` (toy ligado a niño, box ligada a salón; guarda hash del token), `toy_events`, `sensor_readings`, vista `event_context` (lecturas de la caja del salón en los N minutos previos a cada pulsación; ventana por defecto 5 min, parametrizable).

RLS: un padre ve solo a sus hijos; un docente ve a los niños de sus salones. Todas las tablas con RLS activada. **Nunca políticas `anon` de insert** (eran solo del prototipo).

## Reglas de privacidad (no negociables)

Los momentos de ansiedad de un niño son datos personales sensibles (LFPDPPP, México).
- En desarrollo y demo: **solo datos simulados** o de los integrantes. Nada de datos reales de niños.
- El micrófono solo calcula el nivel de ruido en el dispositivo; nunca se graba ni se envía audio. Sin cámaras.
- `service_role` solo en servidor (rutas API / scripts locales). Nunca en el navegador, firmware ni repo.
- Nunca leer, imprimir ni subir `.env*` con valores. Usa `.env.local` (ignorado por git) y mantén `.env.example` sin valores.
- Registro de usuarios con aviso de que se requiere consentimiento del tutor (borrador de texto; el aviso legal completo queda en backlog).

## Marca y UI

- Color principal: naranja-rojo de la marca, aprox. `#DB4A2B` (tomado del PDF de marca; **confirmar hex exacto con Jac**) sobre blanco/crema. Logo y paleta: `Tuli_Marca.pdf`, `Tuli Branding.md`.
- No hay wireframes: proponer UI limpia, amable, con aspecto de juguete y no de dispositivo médico. Mobile first (se usa como PWA).
- Semáforo de condiciones: verde = tranquilo, amarillo = atención, rojo = nivel alto. Umbrales configurables en un solo archivo (`apps/web/src/lib/thresholds.ts`), no hardcodeados en componentes.
- Skill `marca-tuli` para tono y reglas de texto.

## Hardware (referencia; económico)

- Juguete: ESP32-C3 SuperMini, LiPo + TP4056, botón, interruptor, LED. Botón en GPIO0-5 (solo esos despiertan del deep sleep). Hora con NTP + `millis()` desde la pulsación. Cooldown tras cada pulsación. Batería encerrada, carcasa con tornillos.
- Caja: ESP32 DevKit, AHT20 (separado del ESP32 por el calor), BH1750, micrófono MAX4466 (nivel relativo, calibrar una vez; mostrar como "ruido aprox.") o INMP441. Con Wi-Fi las lecturas analógicas van en ADC1.
- Ruido: muestrear continuo y enviar **promedio y pico** por ventana (un portazo dura menos de 1 s).
- Las lecturas y eventos usan `device_id`; la hora la fija el dispositivo (NTP) y el servidor guarda además `received_at` y `ts_source`.

## Flujo de trabajo

- **Claude hace todos los commits y PRs** (Lucy lo delegó el 8 nov): una rama por tarea o día (`dia2-ingesta`), commits pequeños en español, PR a `main` con resumen y qué se verificó. Antes de cada commit, revisar que no se cuelen `.env*` ni claves. No hacer `push --force`.
- Esta semana: `main` sin aprobación obligatoria; commits pequeños y frecuentes, referenciando issue cuando exista (`closes #N`).
- Commits en español, descriptivos. Squash and merge.
- Una skill o plan por tarea grande: empezar cada día en modo plan, leer `docs/plan-semana.md` y `docs/contrato-datos.md`.
- Cada cambio de esquema = una migración nueva en `supabase/migrations` (skill `nueva-migracion`), con RLS y prueba de política.
- Cambios al contrato de datos se hacen primero en `docs/contrato-datos.md`.

## Cómo trabajar con Lucy

- Responder en español.
- En hardware y en Git/GitHub, explicar paso a paso y con verificaciones; poca experiencia más allá de protoboard y subir archivos.
- Si algo en el código, los issues o este archivo se contradice, señalarlo y preguntar en lugar de elegir en silencio.
- Verificar antes de decir que algo funciona (correr build/lint/pruebas, abrir la página).
