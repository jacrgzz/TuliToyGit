# Tuli: todo sobre el IoT

Archivo único de referencia del IoT. Vive en `tuliToy/` (fuera del repo de GitHub) para sobrevivir al cambio de repo. Consolida: contexto original (15 oct 2026), propuesta, esquema del prototipo y decisiones de esta semana (8 nov 2026). El contrato técnico detallado está en `docs-proyecto/contrato-datos.md`; si hay diferencia, el contrato manda.

Estado: **el IoT no está listo.** La demo usa datos simulados. El firmware real se integra después, con el mismo contrato.

## 1. Visión general

Dos dispositivos independientes envían datos por Wi-Fi a `POST /api/ingest` (Next.js en Vercel), que los guarda en Supabase. La PWA cruza pulsaciones con lecturas.

```
Juguete (ESP32-C3) --HTTPS POST--> /api/ingest --> Supabase Postgres --Realtime--> PWA
Caja (ESP32)       --HTTPS POST--> /api/ingest --^
```

Decisión vigente: **no hay comunicación entre juguete y caja**. La propuesta original decía que el juguete avisa a la caja; se descartó. Cada uno envía por separado con su hora (NTP) y el servidor correlaciona (vista SQL `event_context`).

## 2. Dispositivos

### Juguete (fidget)
- Registra solo la marca de tiempo de cada pulsación. Sin audio, cámara ni datos del cuerpo.
- Placa: ESP32-C3 SuperMini (económica) o Seeed XIAO ESP32-C3 (original). Batería LiPo 3.7 V con protección + TP4056, botón táctil 12 mm, interruptor, LED de confirmación.
- Botón en GPIO0 a GPIO5 (solo esos despiertan el ESP32-C3 del deep sleep; el plan usaba GPIO3/D1).
- Hora: NTP + `millis()` transcurridos desde la pulsación, para que la demora de conectarse al Wi-Fi no altere la hora del evento.
- Cooldown tras cada pulsación (no duplicar eventos).
- Batería encerrada y carcasa con tornillos (seguridad infantil).

### Caja multisensor
- Placa: ESP32 DevKit V1 (o C3). Alimentación por eliminador USB 5 V.
- Sensores (versión económica): AHT20 (temp/humedad), BH1750 (luz), MAX4466 o INMP441 (ruido).
- Versión del reporte original: SHT31/AHT20, BH1750, INMP441, RTC DS3231. Propuesta profesional del 13 oct (sin confirmar): SHT41/45, BH1750 con domo, SEN0232 (dBA calibrado), SCD41, y opcionales LD2410C, AS7341, SGP41. **Fuera de alcance por ahora.**
- AHT20 separado del ESP32: el calor del Wi-Fi altera la temperatura.
- Con Wi-Fi activo las lecturas analógicas van en pines ADC1 (ESP32 clásico: GPIO32 a 39); ADC2 no funciona.
- Ruido: muestrear continuo (p. ej. cada 100 ms) y enviar **promedio y pico** por ventana (un portazo dura menos de 1 s). Con MAX4466 es un nivel relativo, calibrar una vez contra una app de sonómetro y mostrar como "ruido aprox.". INMP441 es digital I2S y más fiel, pero más complejo.
- Una lectura cada 5 a 10 s (ventana `window_s`).
- Carcasa estimada 14 x 10 x 6 cm, ESP32 separado de sensores, postes M2.5.

### Costos aproximados (MXN, verificar)
Juguete: ESP32-C3 SuperMini 80-120; LiPo + TP4056 + botón 120-200. Caja: ESP32 DevKit 120-180; AHT20 40-70; BH1750 40-60; MAX4466/INMP441 50-90. Presupuesto original del prototipo completo: 1,722 a 3,177 MXN.

## 3. Contrato de datos v1 (resumen)

Transporte: `POST /api/ingest`, HTTPS, JSON, cabecera `Authorization: Bearer <device_token>`. El token es por dispositivo; el servidor guarda solo su hash. El firmware nunca tiene claves de Supabase.

Pulsación:
```json
{"type":"press","device_id":"tuli-toy-01","ts":"2026-11-09T10:23:05.120Z","ts_source":"ntp","seq":1042}
```
Lectura:
```json
{"type":"reading","device_id":"tuli-box-01","ts":"2026-11-09T10:23:00.000Z","ts_source":"ntp","seq":5531,"window_s":10,"noise_avg":54.2,"noise_peak":71.8,"light_lux":680,"temp_c":24.1,"humidity_pct":48.0}
```
Respuestas: `201` ok, `400` validación, `401` token inválido, `409` seq duplicado (descartar), `429` demasiadas peticiones.
`(device_id, seq)` es único. Si `ts_source` es `unsynced`, el servidor usa `received_at` y la UI marca "hora aproximada".

## 4. Sincronización de hora (dependencia crítica)
La correlación depende de que ambos relojes coincidan. Ambos usan NTP. Tolerancia esperada ±2 s. Ventana de correlación por defecto: 5 min (el prototipo usó 30 s); parametrizable. Si un dispositivo no logra NTP, envía `ts_source: unsynced`.

## 5. Prototipo con Arduino UNO (funcionó)
Sirvió para validar el flujo antes de tener ESP32.
```
Botón y sensores -> Arduino UNO -> USB serie 9600 -> bridge.mjs (Node) -> Supabase REST -> Postgres
Micrófono de la laptop -> mic.py (Python) -> Supabase REST -> noise_dbfs
```
- El UNO imprime JSON por serie: `{"type":"press"}` y `{"type":"reading","light":...,"temp_c":...}`.
- `bridge.mjs` pone la marca de tiempo (el UNO no tiene reloj) e inserta.
- Variables que usaba: `SUPABASE_URL`, `SUPABASE_KEY`, `SERIAL_PORT`, `TOY_ID` (`tilo-toy-01`), `SENSOR_ID` (`tilo-box-01`).
- Esquema viejo: `toy_events(device_id, event, pressed_at)` y `sensor_readings(device_id, measured_at, light_raw, temp_c, noise_dbfs)`, con políticas `anon` de insert (solo prototipo, **no pasan a producción**).
- **Nota:** `bridge.mjs`, `mic.py` y el sketch del UNO **no están en el repo ni en esta carpeta.** Si los tienes, guárdalos en `tuliToy/iot-prototipo/` para adaptarlos a `/api/ingest`.
- Consulta de correlación del prototipo (30 s previos):
```sql
select e.pressed_at, r.device_id, r.measured_at, r.light_raw, r.temp_c, r.noise_dbfs
from toy_events e
join sensor_readings r
  on r.measured_at between e.pressed_at - interval '30 seconds' and e.pressed_at
order by e.pressed_at desc, r.measured_at;
```

## 6. Estrategia para avanzar sin hardware (mismo contrato en todas)
1. **Simulador** (`tools/simulator`): envía pulsaciones y lecturas realistas con picos de ruido antes de las pulsaciones. Cliente de referencia: lo que envía el simulador es exactamente lo que debe enviar el ESP32.
2. **Teléfono** (`/demo`): el teléfono es el juguete (botón grande) y el micrófono del navegador es la caja (solo nivel de ruido, nunca audio; requiere HTTPS).
3. **Puente del UNO**: adaptar `bridge.mjs` para postear a `/api/ingest` con token.
4. **ESP32 real, por etapas**: juguete primero (solo botón + NTP); luego caja con AHT20 y BH1750; micrófono al final. Probar firmware en el simulador Wokwi mientras llega el hardware. Cola offline si falla el Wi-Fi.

## 7. Plan para depurar el IoT (cuando haya hardware)
Diseñado para encontrar fallos rápido:
- Tabla `ingest_log`: cada petición (aceptada o rechazada, con motivo).
- Estado de dispositivos en el dashboard: `last_seen_at`, último `seq`, hora sincronizada o no.
- Pruebas automáticas del contrato (mensajes válidos e inválidos).
- Comparar el mensaje del ESP32 con el del simulador.

Errores típicos y causa probable:

| Síntoma | Causa probable |
| --- | --- |
| 401 | Token mal copiado o dispositivo no registrado |
| 400 | Campo faltante o tipo incorrecto (comparar con el simulador) |
| 409 | Reenvío del mismo `seq`; es normal tras reintento |
| Evento sin contexto de ruido/luz | Relojes desfasados o `ts_source` `unsynced`; caja sin enviar |
| Dispositivo "desaparece" | Wi-Fi, certificado TLS, batería, deep sleep sin reconexión |
| Lecturas de temperatura altas | Sensor muy cerca del ESP32 |
| Lecturas analógicas en 0 con Wi-Fi | Pin en ADC2; mover a ADC1 |

## 8. Privacidad (aplica al IoT)
Datos sensibles de menores (LFPDPPP). El micrófono solo calcula nivel en el dispositivo; nunca se graba ni se envía audio. Sin cámaras ni mediciones del cuerpo. En desarrollo, solo datos simulados o de los integrantes. Nunca `service_role` en firmware ni navegador.

## 9. Pendientes del IoT
- Confirmar con Alex: lista final de sensores, si se envía promedio y pico, ventana de correlación, tamaño de carcasas.
- Recuperar el código del prototipo (UNO, `bridge.mjs`, `mic.py`).
- Elegir micrófono definitivo (MAX4466 vs INMP441) y calibrarlo.
- Registro de dispositivos y emisión de tokens.
- Carcasas (OE7) y prueba continua de 1 día con 100 % de pulsaciones visibles (OE8).
