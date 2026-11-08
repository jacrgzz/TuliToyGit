---
name: verificar-feature
description: Lista de cierre antes de decir que una funcionalidad de Tuli está terminada (página, endpoint, migración o componente). Úsala al terminar cada tarea y antes de proponer un commit.
---

# Verificar una feature antes de darla por terminada

No digas "listo" sin haber pasado esto. Si algo no se pudo verificar, dilo explícitamente.

## 1. Código (dentro de `apps/web`)
- `npm run typecheck` sin errores.
- `npm run lint` sin errores.
- `npm test` si hay pruebas relacionadas.
- La estructura respeta `docs/arquitectura.md`: la ruta en `app/` es delgada, la lógica vive en `features/<nombre>/`, no se importa el interior de otra feature, y el cliente `admin` solo aparece en `features/ingest`.

## 2. En el navegador
- Levanta `npm run dev` y abre la página en el navegador integrado.
- Revisa la consola: sin errores.
- Prueba en ancho de teléfono (375 px) y escritorio.
- Estados vacíos, de carga y de error se ven bien (sin datos, sin conexión, sesión expirada).

## 3. Datos y privacidad
- Prueba con un usuario **padre** y con uno **docente**: cada uno ve solo lo suyo.
- Ningún secreto en el código ni en el navegador (`service_role` nunca en archivos de cliente).
- Solo datos simulados.
- Si cambió el esquema: se corrió el revisor de seguridad de Supabase (MCP `get_advisors`) y no hay tablas sin RLS.

## 4. Textos (skill `marca-tuli`)
- Nada sugiere diagnóstico ("crisis", "ansiedad detectada"). Se habla de "momentos", "eventos" y "condiciones".
- El semáforo no depende solo del color.

## 5. Cierre
- Si cambió el contrato del IoT, se siguió la skill `cambio-contrato`.
- Actualiza `CLAUDE.md` si cambiaron comandos, estructura o decisiones.
- Resume a Lucy qué cambió, qué verificaste y qué quedó pendiente; propón el commit (no lo hagas sin confirmación).
