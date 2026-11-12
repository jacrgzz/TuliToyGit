# Plan técnico · PWA de Tuli

Estado: **propuesta**. Todavía no se implementa. Fecha: 12 nov 2026.

## Objetivo

La PWA es el mismo panel instalado en la pantalla de inicio, con el mismo login. Hoy ya se puede instalar. Lo que falta es:

1. instalar más fácil;
2. ver **lo de hoy** sin internet;
3. escribir en la **bitácora** sin internet;
4. recibir **avisos** con la app cerrada.

## Reglas de privacidad (acordadas con Lucy)

1. En el teléfono se guarda solo **lo de hoy**, con nombres: el resumen y los momentos del día. Se borra al cambiar el día (hora de México).
2. Se borra **al cerrar sesión** y **cuando la sesión vence**.
3. La **Pantalla del salón** (`/pantalla`) nunca guarda nada.
4. Las notas de bitácora pendientes se borran **en cuanto se envían**.
5. Hay un aviso visible: «Lo de hoy se guarda en este teléfono para verlo sin internet. Cierra sesión si el dispositivo es compartido».
6. El service worker **nunca guarda páginas con sesión** (HTML del panel) ni respuestas de Supabase. Solo guarda archivos estáticos y la página «Sin conexión».
7. El aviso «Tuli no es un dispositivo médico» se mantiene en todas las pantallas nuevas.

## Cómo funciona (resumen)

- **Service worker** escrito a mano en `public/sw.js`, sin librerías. `proxy.ts` ya excluye `sw.js` del matcher.
  - Guarda: `/_next/static/*`, íconos, fuentes y `/sin-conexion`.
  - Si una navegación falla por falta de red, responde con `/sin-conexion`.
  - Nunca guarda `/dashboard/*`, `/pantalla`, `/api/*` ni nada de Supabase.
- **Foto de hoy en IndexedDB**, no en el caché del service worker. Cuando hay conexión, «Hoy» le pasa sus datos ya calculados a un componente cliente que los guarda. Sin conexión, `/sin-conexion` los lee y los muestra.
- **Cola de bitácora en IndexedDB.** Si no hay red, la nota se guarda como pendiente y se envía con los mismos server actions de siempre al volver la conexión.

Todo lo que toca IndexedDB vive en un módulo nuevo, `src/lib/offline/`. Las reglas (caducidad, dueño, limpieza) son funciones puras con pruebas en vitest.

---

## Fase 1 · Instalar y entrar rápido

No guarda datos.

| Cambio | Archivo |
| --- | --- |
| `background_color` a `#efe9fb`; quitar el comentario «sin service worker» cuando llegue la fase 2 | `src/app/manifest.ts` |
| `shortcuts`: Hoy (`/dashboard`), Bitácora (`/dashboard/bitacora`), Pantalla del salón (`/pantalla`) | `src/app/manifest.ts` |
| Botón «Instalar Tuli»: usa `beforeinstallprompt` en Android y Chrome. En iPhone muestra una guía corta (Compartir → Agregar a inicio). Se oculta si ya está instalada (`display-mode: standalone`) | `src/features/pwa/components/InstallButton.tsx` (nuevo), en `UserMenu` y en Ayuda |
| Aviso en la guía de iPhone: la app instalada no comparte sesión con Safari, hay que entrar una vez dentro de la app | Ayuda (`dashboard/ayuda#app`) |
| Después del login, el tutor con un solo hijo entra directo a la vista del niño (ya pasa en `dashboard/page.tsx`; solo se verifica) | — |

**Pruebas:** `check-pages` revisa que `/manifest.webmanifest` tenga los atajos y el color nuevo.

## Fase 2 · Resumen de hoy sin conexión

| Cambio | Archivo |
| --- | --- |
| Service worker: instala el caché estático, usa red primero en navegaciones y responde `/sin-conexion` si falla. Lleva versión para borrar cachés viejos | `public/sw.js` (nuevo) |
| Registro del service worker, solo en producción y fuera de `/pantalla` | `src/features/pwa/components/RegisterSW.tsx` (nuevo), en `app/layout.tsx` |
| Foto de hoy: `{ userId, role, dayMx, savedAt, data }`. `data` lleva los 5 indicadores, el resumen semanal y los momentos de hoy (docente) o el resumen del hijo (tutor). Admin no guarda nada | `src/lib/offline/snapshot.ts` (nuevo) |
| Reglas puras: `isSnapshotUsable(snap, { userId, now })`. No sirve si es de otro usuario o de otro día en hora de México (`lib/time-mx`) | `src/lib/offline/rules.ts` + `rules.test.ts` |
| `SaveTodaySnapshot`: componente cliente sin interfaz que recibe los datos ya calculados y los guarda | `src/features/pwa/components/SaveTodaySnapshot.tsx`, usado en `app/dashboard/page.tsx` |
| Página «Sin conexión»: estática, sin sesión. Lee la foto y, si sirve, la muestra con «Actualizado 10:42 · sin conexión». Si no, dice «Sin conexión. Abre Tuli con internet para ver lo de hoy». Enlace a la bitácora pendiente | `src/app/sin-conexion/page.tsx` (nuevo) |
| Limpieza al cerrar sesión: botón cliente que borra IndexedDB y los cachés y después llama a `signOut()` | `src/features/auth/components/UserMenu.tsx` |
| Limpieza cuando la sesión vence: `/login` borra todo al montarse (si llegaste ahí, no hay sesión válida) | `src/app/login/` |
| Limpieza por día: al abrir la app se borra cualquier foto de un día anterior | `src/lib/offline/snapshot.ts` |
| Aviso de privacidad (regla 5) | `UserMenu` y Ayuda |

**Por qué IndexedDB y no el caché del service worker:** si se guardara el HTML del panel, quedarían guardadas páginas completas con sesión y no se podría controlar qué se guarda ni borrarlo por día. Con IndexedDB se guarda solo lo que la regla permite.

**Pruebas:**
- vitest: foto de otro usuario o de ayer → no sirve; admin → no se guarda; la limpieza borra todo.
- `check-pages`: `/sin-conexion` responde 200 sin sesión y su HTML no contiene nombres de niños (los nombres solo llegan desde IndexedDB en el cliente). `/sw.js` responde con `Service-Worker-Allowed` correcto.
- Manual: en Chrome DevTools → Network → Offline, abrir la app instalada y ver la foto de hoy. Cerrar sesión y confirmar en Application → IndexedDB que quedó vacío.

## Fase 3 · Bitácora sin conexión

La bitácora tiene dos escrituras: **actividades** (`createActivity`, tabla `classroom_activities`) y **notas de momentos** (`saveEventNote`, tabla `event_notes`).

| Cambio | Archivo |
| --- | --- |
| Cola: `{ id, kind: "activity" \| "eventNote", userId, payload, createdAt }`. Solo del usuario actual | `src/lib/offline/queue.ts` + `queue.test.ts` |
| Actividades sin duplicados: el cliente genera el `id` (uuid). `activityInput` acepta `id` opcional y el insert lo usa. Si se reenvía y ya existe (error `23505`), se toma como enviado | `src/features/activities/schemas.ts`, `actions.ts` |
| Notas: `saveEventNote` ya es idempotente (actualiza o inserta), no cambia | — |
| Formulario: si `navigator.onLine` es falso o el envío falla por red, guarda en la cola y muestra «Pendiente de enviar» | `ActivityLog.tsx`, `EventNoteForm.tsx` |
| Envío: al volver la red (evento `online`) y al abrir la app. En iPhone no hay envío en segundo plano, así que la pantalla dice «Se enviará cuando abras Tuli con internet» | `src/features/pwa/components/SyncQueue.tsx`, en `dashboard/layout.tsx` |
| Cada nota se borra de la cola al recibir `ok: true`. Si el servidor la rechaza (permisos o datos), se muestra el error y se deja para que la maestra la corrija o descarte | `queue.ts` |
| Al cerrar sesión con pendientes: confirmar «Tienes 2 notas sin enviar. Si cierras sesión se borran» | `UserMenu` |
| Leer notas anteriores sin conexión: **no** (solo lo de hoy, por la regla 1) | — |

**Pruebas:**
- vitest: la cola filtra por usuario; un reenvío con el mismo id no duplica; `ok` borra, un error de datos no borra.
- `check-rls`: un insert de actividad con un `id` repetido no sobrescribe la de otro salón.
- Manual: modo avión → crear actividad → «Pendiente» → quitar modo avión → aparece en la bitácora una sola vez.

## Fase 4 · Avisos push (después)

| Cambio | Detalle |
| --- | --- |
| Migración `push_subscriptions` (`user_id`, `endpoint`, claves, `created_at`), con RLS: cada usuario solo ve y borra las suyas | con la skill `nueva-migracion` |
| Claves VAPID en variables de entorno (`.env.local` y Vercel). No se escriben en el código | — |
| Permiso: se pide solo al tocar «Activar avisos», nunca al abrir la app | `src/features/pwa/components/PushToggle.tsx` |
| Envío: los mismos avisos de la campana (ruido alto ahora, batería baja, juguete sin datos). El texto **no lleva nombres** («Ruido alto en tu salón»); el detalle se ve al abrir la app | ruta de servidor + librería `web-push` |
| Al cerrar sesión se borra la suscripción | `UserMenu` |
| iPhone: solo funciona con la app instalada (iOS 16.4+). La guía lo dice | Ayuda |

Falta decidir **quién dispara el envío**: un cron de Vercel cada pocos minutos o un trigger de Supabase. Se decide al llegar a esta fase.

---

## Orden y ramas

1. `pwa-instalar` (fase 1): chica, se puede hacer en una sesión.
2. `pwa-sin-conexion` (fase 2).
3. `pwa-bitacora-offline` (fase 3): depende de la fase 2 (`lib/offline`).
4. `pwa-push` (fase 4): independiente, después del deploy en Vercel.

En cada rama: `npm run verify:all` en verde, revisión manual a 375 px y en la app instalada, commit en español, PR, y actualizar `CLAUDE.md`, `docs/pruebas.md` y la diapositiva 7 de la presentación.

## Decisiones del `CLAUDE.md` que este plan cambia

- `CLAUDE.md` dice «PWA: sin service worker a propósito». Con las reglas de privacidad de arriba, Lucy aprobó cambiarlo (12 nov 2026). Al implementar la fase 2 hay que actualizar esa fila y el comentario de `manifest.ts`.
- Las notificaciones push estaban «fuera de alcance esta semana». La fase 4 queda para después del deploy.
- Next.js 16: antes de escribir el registro del service worker o tocar `proxy.ts`, leer la guía en `apps/web/node_modules/next/dist/docs/` (hay una sección de PWA).

## Riesgos

- **Dispositivo compartido sin cerrar sesión:** lo de hoy queda visible hasta medianoche. Por eso existe el aviso (regla 5), y la Pantalla del salón no guarda nada.
- **Caché viejo después de un deploy:** el service worker lleva versión y borra los cachés anteriores al activarse.
- **Safari borra IndexedDB** si la app no se abre en ~7 días. Para la foto de hoy no importa. Para la cola sí podría perder notas: se avisa en Ayuda.
