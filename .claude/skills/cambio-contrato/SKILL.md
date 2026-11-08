---
name: cambio-contrato
description: Cambiar el contrato de datos del IoT (campos, tipos, unidades, códigos de respuesta o mensajes de juguete/caja) manteniendo sincronizados docs, esquema zod, migraciones, simulador, pruebas y firmware. Úsala antes de tocar cualquier campo que envíen los dispositivos o que reciba /api/ingest.
---

# Cambio en el contrato de datos

El contrato es lo que hace sencillo integrar el IoT. Si una pieza queda desincronizada, el hardware falla y no se sabe por qué. Sigue el orden; no saltes pasos.

## 1. Decidir y documentar
- Explica a Lucy el cambio, por qué y qué rompe (firmware ya escrito, datos existentes).
- Si el cambio no es compatible hacia atrás, sube la versión del contrato (v1 → v2) y define qué pasa con los dispositivos viejos.
- Actualiza `docs/contrato-datos.md` primero: ejemplo JSON, tabla de campos, respuestas y pendientes.

## 2. Propagar en este orden
1. **Migración** (skill `nueva-migracion`) si cambia una columna o tabla.
2. **`apps/web/src/features/ingest/schemas.ts`**: única definición del contrato en código.
3. **`features/ingest/handle.ts`**: mapeo del mensaje a las columnas.
4. **Tipos**: regenerar `src/lib/database.types.ts`.
5. **Simulador** (`tools/simulator`): debe enviar exactamente el nuevo formato (importa el esquema, no lo copies).
6. **Pruebas** del contrato: un caso válido y uno inválido por cada campo nuevo o modificado.
7. **UI** que muestra el campo (etiquetas, unidades, umbrales en `lib/thresholds.ts`).
8. **Firmware** (`firmware/`) si ya existe, o deja una nota en la sección Pendientes de `docs/iot.md`.

## 3. Documentación del IoT (dos copias)
- `docs/iot.md` (dentro del repo).
- `/Users/luciayanez/Desktop/tuliToy/IOT.md` (respaldo fuera del repo). Deben quedar iguales en la sección del contrato.

## 4. Verificar
- `npm run typecheck`, `npm test`.
- Corre el simulador contra `npm run dev` y confirma `201` y la fila en la tabla.
- Envía un mensaje inválido y confirma `400` y su registro en `ingest_log`.
- Reporta qué archivos cambiaste y qué verificaste. Si algún paso no aplica, dilo.
