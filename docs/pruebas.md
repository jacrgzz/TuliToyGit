# Pruebas de Tuli

Catálogo de todas las pruebas que hay (y las que faltan). Cada una está marcada así:

- **[AUTO]** se corre con un comando y falla de verdad si algo está mal.
- **[MANUAL]** la hace una persona con la lista de abajo.
- **[PENDIENTE]** todavía no existe.

## Regla de oro

**Ninguna funcionalidad se da por terminada sin `npm run verify` en verde** (desde `apps/web`), más lo que pida su tipo de cambio (sección B) y lo manual que aplique (sección C). Quien dice "listo" (persona o Claude) debe poder nombrar qué corrió y qué no.

| Comando (desde `apps/web`) | Qué corre | Necesita |
| --- | --- | --- |
| `npm run verify` | Secretos, typecheck, lint, pruebas unitarias, build, secretos en el bundle | Nada |
| `npm run verify:live` | Ingesta, RLS, páginas por rol, Realtime, demo, migraciones y lint de la BD | Supabase y datos de prueba (ver abajo) |
| `npm run verify:all` | Los dos anteriores; levanta y detiene `npm run dev` solo | Igual |

**En GitHub:** `.github/workflows/verify.yml` corre `npm run verify` (solo la parte estática) en cada PR y en cada push a `main`. No usa ningún secreto de Supabase: usa valores de relleno. Las pruebas contra el proyecto real (`verify:live`) **siguen siendo locales** y obligatorias antes de dar algo por terminado, porque correrlas en GitHub exigiría guardar la `service_role` allí.

Datos de prueba (una vez): en `tools/simulator`, `npm run provision` y `npm run simulate -- --backfill 60 --no-live`. Cada prueba `check-*` también se corre sola con `npm run check-<nombre>` desde `tools/simulator`.

---

## A. Obligatorias en TODA funcionalidad (`npm run verify:all`)

| # | Prueba | Qué detecta | Tipo |
| --- | --- | --- | --- |
| A1 | Secretos en el repo (`tools/verify/check-secrets.mjs`) | `.env` rastreado por git, claves `sb_secret_`, JWT, URLs de BD con contraseña, valores reales de `.env.local` en cualquier archivo. Nunca imprime valores | AUTO |
| A2 | TypeScript (`npm run typecheck`) | Errores de tipos, incluidos los de la base de datos generada | AUTO |
| A3 | ESLint (`npm run lint`) | Reglas de React y Next (p. ej. `Date.now()` dentro de componentes) | AUTO |
| A4 | Pruebas unitarias (`npm test`) | Contrato v1 (mensajes válidos e inválidos) y reglas de hora | AUTO |
| A5 | Build de producción (`npm run build`) | Que compila con Cache Components y que cada ruta se clasifica bien | AUTO |
| A6 | Secretos en el bundle (`check-bundle.mjs`) | Que nada sensible llegue al código del navegador | AUTO |
| A7 | API de ingesta (`check-ingest`) | 401 sin token, token falso o `device_id` ajeno; 201; 409 duplicado; 400 por campo con typo, rango, tipo de dispositivo, JSON roto y cuerpo grande; reglas de hora; `ingest_log` | AUTO |
| A8 | Políticas RLS (`check-rls`) | Aislamiento entre tutores, docente, admin solo lectura, nadie se asciende, `token_hash` oculto, anónimo sin acceso, escrituras bloqueadas | AUTO |
| A9 | Páginas por rol (`check-pages`) | Cada rol ve lo suyo; un tutor no abre datos ajenos; redirecciones; **errores de render** (incluso los que no rompen el HTTP 200) | AUTO |
| A10 | Realtime respeta RLS (`check-realtime`) | Que un tutor recibe lo de su hijo y otro tutor no | AUTO |
| A11 | Modo demo (`check-demo`) | Server actions, autorización por RLS, rangos y sesión | AUTO |
| A12 | Migraciones locales = remotas | Una migración sin aplicar o aplicada sin archivo | AUTO |
| A13 | Lint del esquema (`supabase db lint --remote`) | Errores de tipos en funciones SQL | AUTO |
| A14 | Log de `npm run dev` sin errores | Advertencias como `unstable value Date.now()` que no rompen la página pero sí la experiencia | MANUAL (revisar la terminal) |
| A15 | Textos sin lenguaje clínico (skill `marca-tuli`) | "Crisis", "ansiedad detectada", causas o diagnósticos; el aviso de que Tuli no es dispositivo médico | MANUAL |

---

## B. Pruebas adicionales según el tipo de cambio

| Si el cambio toca… | Además de la sección A, haz |
| --- | --- |
| **Una migración, tabla, vista, función o política** | Skill `nueva-migracion`: `db push --remote --dry-run` antes de aplicar; regenerar `database.types.ts`; agregar la verificación a `check-rls` (padre A no ve lo de B, docente ve su salón, admin solo lee); Security Advisor de Supabase (MCP `get_advisors` o panel → Advisors); evitar `select *` en tablas con permisos por columna (`devices`) |
| **El contrato de datos o `/api/ingest`** | Skill `cambio-contrato`: actualizar `docs/contrato-datos.md`, `schemas.ts`, simulador, pruebas A4 y `check-ingest`, `docs/iot.md` y `tuliToy/IOT.md`; un caso válido y uno inválido por campo nuevo |
| **Una página o componente** | Sección C completa (visual, móvil, estados, accesibilidad); si lee datos, que vaya dentro de `<Suspense>`; probarla con tutor, docente y admin |
| **Login, sesión o `proxy.ts`** | Entrar y salir con Google y con cuenta demo; sesión expirada; ruta protegida sin sesión; `/login` con sesión; cookies de Supabase actualizadas |
| **Realtime** | `check-realtime`; abrir dos navegadores (tutor y otro tutor) y mandar un evento con el simulador; esperar ~1.5 s tras suscribirse antes de insertar |
| **El modo demo o la PWA** | `check-demo`; probar el micrófono real y la instalación en un teléfono (sección D); confirmar `DEMO_MODE` apagado en producción |
| **Dependencias, `next.config` o versión de Next** | Leer la doc en `node_modules/next/dist/docs/`; build limpio; revisar el log de dev; `npm audit` |
| **Umbrales o patrones** (`lib/thresholds.ts`, `child_patterns`) | Revisar los textos de `PatternsCard` (solo coincidencias, nunca causas); confirmar valores con especialistas (OE1) |

---

## C. Revisión manual de cada pantalla [MANUAL]

Con `npm run dev` y la cuenta correspondiente (`padre1@tuli.test`, `docente@tuli.test`, `admin@tuli.test`; la contraseña es `DEMO_PASSWORD` en `apps/web/.env.local`):

1. **Aspecto en escritorio y en ancho de teléfono (375 px).** Nada se corta, no hay scroll horizontal, los botones se pueden tocar.
2. **Estados.** Carga ("Cargando…"), vacío (sin eventos, sin lecturas, sin niños vinculados), error (¿se muestra algo entendible?) y datos viejos ("Sin lecturas recientes").
3. **Consola del navegador** sin errores ni avisos rojos.
4. **Terminal de `npm run dev`** sin errores (A14).
5. **Accesibilidad básica.** Se puede usar con teclado (Tab/Enter); el semáforo siempre lleva texto además del color; contraste legible; botones con nombre.
6. **Textos** (A15) y datos de niños solo con alias.
7. **Hora.** Los eventos se muestran en hora de México; los de hora aproximada están marcados.
8. **Enlaces por rol.** Un tutor no ve enlaces a vistas que no le tocan (salones, admin).

---

## D. Antes de cada demo o entrega [MANUAL]

Recorrido completo, de punta a punta:

1. `npm run verify:all` en verde.
2. `npm run simulate` (en vivo) y, en otra ventana, abrir el panel del niño: el indicador dice "En vivo" y los números cambian sin recargar.
3. Una pulsación desde `/demo` aparece en "Momentos recientes" y su detalle muestra las lecturas previas.
4. Los patrones muestran coincidencias coherentes y la frase "no indican la causa".
5. Vista del docente: condiciones del salón y actividad de los niños.
6. Panel del admin: dispositivos en línea o sin señal, usuarios, registro de ingesta sin errores inesperados.
7. **Login con Google real** (cuenta de prueba) y vinculación con `npm run link`.
8. **Instalar la PWA** en un teléfono (Android: "Instalar app"; iPhone: "Agregar a pantalla de inicio"): abre en `/dashboard` con el ícono de Tuli.
9. **Micrófono real** en `/demo` (permiso, nivel de ruido, calibración) y comprobar que **no** se sube audio (pestaña de red: solo peticiones con números).
10. Otro navegador o usuario sin vínculos: ve "Todavía no tienes niños vinculados" y ningún dato.
11. Con la app desplegada: repetir 2 a 10 contra la URL pública de Vercel.

---

## E. Seguridad y privacidad

| Prueba | Estado |
| --- | --- |
| Anónimo no puede leer ni escribir ninguna tabla (permission denied) | AUTO (`check-rls`, A8) |
| Un tutor no ve niños, eventos, contexto ni lecturas de otro; tampoco por URL directa ni por Realtime | AUTO (A8, A9, A10) |
| Nadie puede ascenderse a admin; el admin no escribe; `token_hash` no es legible por nadie | AUTO (A8) |
| El token de un dispositivo solo sirve para ese dispositivo y su tipo | AUTO (A7) |
| Ningún secreto en git, en archivos nuevos ni en el bundle del navegador | AUTO (A1, A6) |
| `service_role` solo en servidor (`admin.ts` con `server-only`) | AUTO parcial: `server-only` falla el build si se importa en cliente (A5) |
| El micrófono nunca envía audio | MANUAL (D9) |
| `DEMO_MODE` y el formulario de cuentas demo apagados con datos reales | MANUAL (checklist de despliegue) |
| Políticas `anon` de insert del prototipo viejo no existen | AUTO (A8) |
| Límite de peticiones por dispositivo (429) | PENDIENTE (no implementado) |
| Rotación y revocación de tokens de dispositivo | PENDIENTE |
| Consentimiento del tutor y aviso de privacidad (LFPDPPP) | PENDIENTE (borrador; ver `docs/`) |

---

## F. Hardware e IoT real [PENDIENTE hasta que haya firmware]

Cuando exista el firmware de los ESP32, cada prueba se compara contra lo que envía `tools/simulator` (el cliente de referencia del contrato):

1. **Contrato.** El mensaje real pasa el esquema (`ingest` responde 201) y no tiene campos de más.
2. **Autenticación.** Token correcto → 201; token mal copiado → 401 visible en el registro de ingesta del admin.
3. **Hora (NTP).** Juguete y caja con `ts_source: ntp`; si no hay NTP, `unsynced` y la UI lo marca; diferencia entre relojes menor a 2 s.
4. **Pulsación.** Cada toque llega una sola vez (cooldown); `seq` sube siempre; un reintento da 409 y no duplica.
5. **Pérdida de Wi-Fi.** Sin red el dispositivo no pierde datos (cola offline) y al volver llegan con su hora original.
6. **Reinicio y deep sleep.** El juguete despierta con el botón (GPIO0 a GPIO5) y envía; el `seq` no se reinicia en conflicto.
7. **Caja.** Promedio y pico de ruido por ventana (un portazo se ve); AHT20 separado del ESP32 (temperatura sin sesgo por calor); lecturas analógicas en ADC1.
8. **Calibración del ruido.** Contra un sonómetro; la UI dice "ruido aprox.".
9. **Prueba continua (OE8).** Al menos 1 día de registro seguido con el 100 % de las pulsaciones visibles en la PWA; contar pulsaciones físicas contra las del panel.
10. **Batería y seguridad infantil.** Duración medida; batería encerrada; carcasa con tornillos.

---

## G. Rendimiento y datos [PENDIENTE]

- Con volumen realista (una lectura cada 10 s ≈ 8,600 filas por caja al día): medir el tiempo de `event_context`, `event_summary` y `child_patterns` a 30 días; revisar índices si pasa de 1 segundo.
- Varios dispositivos enviando a la vez (un salón completo: 1 caja y 30 juguetes).
- Tamaño de las páginas y tiempo de carga en red móvil lenta.

---

## H. Lo que todavía NO está cubierto (siendo honestos)

| Hueco | Qué haría falta |
| --- | --- |
| Pruebas de navegador automatizadas (clics, formularios, aspecto) | Playwright: login demo, abrir paneles, `/demo` |
| Login con Google real | Solo manual (D7); no se puede automatizar sin exponer una cuenta |
| Micrófono e instalación de la PWA | Solo manual (D8, D9) |
| Accesibilidad automatizada | axe o Lighthouse en CI |
| Integración continua de las pruebas contra Supabase | La parte estática ya corre en GitHub; `verify:live` en GitHub requeriría un proyecto de Supabase aparte para CI y guardar sus claves como secretos del repositorio |
| Carga y límite de peticiones | Prueba de estrés después de implementar el 429 |
