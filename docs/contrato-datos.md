# Contrato de datos v1 (borrador)

Fuente de verdad entre dispositivos (reales, simulados o el teléfono), la API y la base de datos. Cualquier cambio se hace primero aquí. Cumple OE2.

## Transporte

`POST /api/ingest` con HTTPS y JSON. Cabecera `Authorization: Bearer <device_token>`. El servidor guarda solo el hash del token en `devices` y deduce el dispositivo del token (el `device_id` del cuerpo debe coincidir).

El firmware nunca usa claves de Supabase.

## Mensajes

### Pulsación del juguete

```json
{
  "type": "press",
  "device_id": "tuli-toy-01",
  "ts": "2026-11-09T10:23:05.120Z",
  "ts_source": "ntp",
  "seq": 1042
}
```

### Lectura de la caja (ventana de muestreo)

```json
{
  "type": "reading",
  "device_id": "tuli-box-01",
  "ts": "2026-11-09T10:23:00.000Z",
  "ts_source": "ntp",
  "seq": 5531,
  "window_s": 10,
  "noise_avg": 54.2,
  "noise_peak": 71.8,
  "light_lux": 680,
  "temp_c": 24.1,
  "humidity_pct": 48.0
}
```

Todos los campos de sensor son opcionales (un sensor ausente se omite o va `null`).

### Campos

| Campo | Tipo | Notas |
| --- | --- | --- |
| `type` | `press` \| `reading` | obligatorio |
| `device_id` | texto | `tuli-toy-NN` / `tuli-box-NN` |
| `ts` | ISO 8601 UTC | hora del evento medida en el dispositivo |
| `ts_source` | `ntp` \| `server` \| `unsynced` | si es `unsynced`/ausente, el servidor usa `received_at` |
| `seq` | entero creciente | detecta pérdidas y duplicados; `(device_id, seq)` es único |
| `window_s` | entero | duración de la ventana de la lectura |
| `noise_avg`, `noise_peak` | real | dB aproximados (ver nota); sin audio |
| `light_lux` | real | lux |
| `temp_c` | real | °C |
| `humidity_pct` | real | 0 a 100 |

Nota: con micrófono analógico (MAX4466) el valor es un nivel relativo calibrado contra una app de sonómetro; la UI lo etiqueta "ruido aprox.".

### Respuesta

`201 {"ok":true}` · `400 {"ok":false,"error":"invalid","issues":[...]}` validación (zod; `issues` dice qué campo falló) · `401` token ausente o inválido, o `device_id` del cuerpo distinto al del token · `409 {"ok":true,"duplicate":true}` `seq` repetido (idempotente: el cliente puede descartar) · `500` error del servidor.

El esquema es **estricto**: un campo desconocido (por ejemplo `temperature` en lugar de `temp_c`) da `400`. Una pulsación solo la acepta un dispositivo `toy` y una lectura solo un dispositivo `box`. El cuerpo máximo es 4096 bytes. El `429` (límite de peticiones) **no está implementado** todavía.

Cada petición queda registrada en la tabla `ingest_log` (aceptada o rechazada, con el motivo); solo es legible con `service_role`.

La definición en código está en `apps/web/src/features/ingest/schemas.ts`.

## Tablas (resumen; las migraciones son la referencia final)

- `profiles(id → auth.users, role guardian|teacher, full_name)`
- `classrooms(id, name)`
- `children(id, classroom_id, display_name)` (alias o iniciales; sin datos de identidad reales en desarrollo)
- `guardians(profile_id, child_id)`
- `teacher_classrooms(profile_id, classroom_id)`
- `devices(id, device_id, kind toy|box, child_id null, classroom_id null, token_hash, last_seen_at)`
- `toy_events(id, device_id, child_id, occurred_at, received_at, ts_source, seq)`
- `sensor_readings(id, device_id, classroom_id, measured_at, received_at, ts_source, seq, window_s, noise_avg, noise_peak, light_lux, temp_c, humidity_pct)`
- Vista `event_context(event_id, child_id, occurred_at, reading fields…)`: lecturas de la caja del salón del niño con `measured_at` entre `occurred_at - ventana` y `occurred_at` (ventana por defecto 5 min).

## RLS

- Padre (`guardian`): `select` solo de sus hijos y de los eventos/lecturas relacionados.
- Docente (`teacher`): `select` de niños de sus salones y su contexto.
- Inserciones solo desde `/api/ingest` con `service_role` en servidor. Ninguna política `anon`.

## Sincronización de hora

Ambos dispositivos usan NTP. Reglas que aplica el servidor (`features/ingest/time.ts`):

| Situación | Hora guardada | `ts_source` guardado |
| --- | --- | --- |
| Sin `ts` | hora de llegada | `server` |
| `ts_source: unsynced` | hora de llegada | `unsynced` |
| `ts` más de 2 min en el futuro, o de hace más de 7 días | hora de llegada | `unsynced` |
| `ts` válido (incluye colas offline y datos de hace horas) | `ts` | el declarado, o `ntp` si no declaró |

La UI marca como "hora aproximada" lo que no sea `ntp`. Tolerancia de correlación esperada: ±2 s.

## Contexto de eventos

La vista `event_context` une cada pulsación con las lecturas de la caja del salón del niño de los **5 minutos previos** (fijo en la vista; si se necesita otra ventana se agrega una función RPC). Respeta RLS (`security_invoker`).

## Pendientes

- Validar con Alex si el firmware real enviará promedio y pico (se asume que sí).
- Confirmar ventana de correlación definitiva (5 min por defecto).
- Límite de peticiones (429) y rotación/emisión de tokens desde la UI.
