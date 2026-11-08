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

`201 {"ok":true}` · `400` validación (zod) · `401` token inválido · `409` `seq` duplicado (idempotente: el cliente puede descartar) · `429` demasiadas peticiones.

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

Ambos dispositivos usan NTP. Si falla, `ts_source = unsynced` y el servidor usa `received_at`; esos eventos se marcan en la UI como "hora aproximada". Tolerancia de correlación esperada: ±2 s.

## Pendientes

- Validar con Alex si el firmware real enviará promedio y pico (se asume que sí).
- Confirmar ventana de correlación definitiva (5 min por defecto).
