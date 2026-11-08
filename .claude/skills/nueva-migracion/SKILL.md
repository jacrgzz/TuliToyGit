---
name: nueva-migracion
description: Crear una migración de Supabase para Tuli (tabla, columnas o vista) con RLS y prueba de política. Úsala cada vez que cambie el esquema de la base de datos.
---

# Nueva migración de Supabase

1. Lee `docs/contrato-datos.md`. Si el cambio altera el contrato, actualízalo primero.
2. Crea el archivo con `npx supabase migration new <nombre_en_snake_case>` desde la raíz del repo (queda en `supabase/migrations`).
   - Las migraciones se aplican **solo con el CLI** y siempre con `--remote` (`npx supabase db push --remote`; sin `--remote` el CLI v3 busca una BD local en Docker y falla). **No uses** la herramienta `apply_migration` del MCP: registra otra versión y desincroniza el historial con los archivos del repo.
   - El MCP de Supabase sí se usa para inspeccionar (`list_tables`, `execute_sql` de solo lectura), generar tipos y correr `get_advisors` (seguridad) después de cada migración.
3. Escribe el SQL:
   - Tablas en `public`, `id` uuid o identity, `created_at timestamptz default now()`.
   - **`alter table ... enable row level security`** en toda tabla nueva, siempre.
   - Políticas por rol: `guardian` ve a sus hijos (vía `guardians`), `teacher` ve a los niños de sus salones (vía `teacher_classrooms`). Usa funciones auxiliares `security definer` con `search_path` fijo para evitar recursión de RLS.
   - **Nunca** políticas para `anon` ni `with check (true)`. Las inserciones de dispositivos las hace `/api/ingest` con `service_role`.
   - Índices en `(device_id, occurred_at/measured_at)` y en llaves foráneas usadas por RLS.
4. Agrega o actualiza datos simulados en `supabase/seed.sql` (solo datos ficticios).
5. Verifica: aplica con `npx supabase db push --remote`, y prueba la política: consulta como padre A y confirma que NO ve datos del padre B; consulta como docente y confirma que ve su salón.
6. Reporta qué verificaste y qué no. No digas "listo" sin haber probado las políticas.
