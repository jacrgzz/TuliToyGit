# Plan de la semana (8 a 15 nov 2026): demo con datos simulados

Una persona + Claude Code. Cada día: modo plan, leer `CLAUDE.md` y `docs/contrato-datos.md`, terminar con algo que se pueda abrir y demostrar.

| Día | Entregable | Criterio de terminado |
| --- | --- | --- |
| 1 | Repo limpio (`.gitignore`, `.env` fuera de git), Supabase nuevo, Next.js + Tailwind + shadcn en `apps/web`, contrato v1 | `npm run dev` abre; `.env.local` funcionando; sin secretos en git |
| 2 | Migraciones con roles y RLS, `/api/ingest` con token por dispositivo, simulador en `tools/simulator` | El simulador inserta pulsaciones y lecturas; consulta de `event_context` devuelve datos; prueba de que un padre no ve niños ajenos |
| 3 | Landing (con aviso "Tuli no diagnostica") y login/registro con rol | Registro y login funcionan; rutas protegidas |
| 4 | Dashboard del padre: panel en vivo (Realtime) con semáforo, historial y detalle de evento | Al correr el simulador la UI se actualiza sola |
| 5 | Vista del docente por salón, patrones en SQL, deploy en Vercel | URL pública con datos simulados |
| 6 | PWA instalable, `/demo` (teléfono como juguete y caja), puente Arduino UNO a `/api/ingest` | Se instala en el teléfono; un botón genera un evento visible |
| 7 | Colchón, revisión de RLS, textos de privacidad, ensayo de demo | Guion de demo ensayado y lista de pendientes |

## Fuera de alcance

Push, ML, sensores extra, RTC, inglés, aviso de privacidad legal completo, firmware real de ESP32 (se integra después con el mismo contrato).

## Hardware económico para después de la demo (precios aprox. MXN, verificar)

Juguete: ESP32-C3 SuperMini 80-120, LiPo + TP4056 + botón 120-200. Caja: ESP32 DevKit 120-180, AHT20 40-70, BH1750 40-60, MAX4466/INMP441 50-90.

## Riesgos

- Mucho alcance para una persona: si el día 4 va tarde, recortar la vista de docente a lista simple.
- Dependencia de colores exactos de la marca: usar `#DB4A2B` y confirmar con Jac.
- `/demo` con micrófono del navegador requiere HTTPS (Vercel lo da).
