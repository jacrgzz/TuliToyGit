---
name: verificar-feature
description: Puerta de calidad obligatoria antes de decir que una funcionalidad de Tuli está terminada (página, endpoint, migración, componente, cambio de contrato o de dependencias). Úsala al terminar CADA tarea y antes de proponer un commit o PR.
---

# Verificar una feature antes de darla por terminada

Catálogo completo en `docs/pruebas.md`. **No digas "listo" sin haber hecho esto.** Si algo no se pudo verificar, dilo explícitamente en el resumen.

## 1. Obligatorio SIEMPRE: `npm run verify:all`

Desde `apps/web`. Corre secretos, typecheck, lint, pruebas unitarias, build, secretos en el bundle, y contra Supabase: ingesta, RLS, páginas por rol, Realtime, demo, migraciones sincronizadas y lint de la BD. Levanta y detiene `npm run dev` solo.

- Debe terminar con `TODO PASA`. Si algo falla, **arréglalo y vuelve a correr**; no lo expliques ni lo omitas.
- Si cambiaste solo documentación o textos sin tocar código, basta `npm run verify`.
- Primera vez: en `tools/simulator`, `npm run provision` y `npm run simulate -- --backfill 60 --no-live`.
- No leas ni imprimas `.env*`: los scripts leen sus valores sin mostrarlos.

## 2. Según lo que cambió (ver sección B de `docs/pruebas.md`)

- **Migración, tabla, vista, función o política:** skill `nueva-migracion`; `--dry-run` antes de aplicar; regenerar tipos; **agrega la verificación nueva a `check-rls.ts`** (un tutor no ve lo de otro, el docente ve su salón, el admin solo lee); correr el Security Advisor; no usar `select *` en tablas con permisos por columna.
- **Contrato de datos o `/api/ingest`:** skill `cambio-contrato`; agrega un caso válido y uno inválido a `schemas.test.ts` y a `check-ingest.mjs`.
- **Página o componente nuevos:** agrega la ruta y sus verificaciones a `check-pages.mjs` (qué ve cada rol, qué NO debe ver, sin errores de render). Lo que lee datos va dentro de `<Suspense>`.
- **Realtime, demo o PWA:** `check-realtime` / `check-demo` ya cubren lo básico; amplíalos si añadiste comportamiento.
- **Dependencias o configuración de Next:** leer la doc en `apps/web/node_modules/next/dist/docs/`.

**Regla:** una funcionalidad nueva sin su prueba automática no está terminada. Si de verdad no se puede automatizar, escríbelo en la sección H de `docs/pruebas.md` y en el resumen.

## 3. Revisión manual (sección C de `docs/pruebas.md`)

- Abre la página con `npm run dev` y la cuenta del rol que corresponda; revisa ancho de teléfono (375 px) y escritorio.
- Estados vacío, de carga, de error y datos viejos.
- Consola del navegador **y terminal de `npm run dev` sin errores** (un error puede no romper la página pero sí la experiencia).
- Textos (skill `marca-tuli`): nada de diagnóstico ni causas; el semáforo nunca solo con color.
- Si usas el navegador integrado y no puedes iniciar sesión sin leer secretos, di que el aspecto con sesión no se pudo ver.

## 4. Cierre

- Si cambiaron comandos, estructura o decisiones, actualiza `CLAUDE.md` (y el respaldo en `tuliToy/docs-proyecto/`).
- Resume a Lucy: qué cambió, **qué corriste y su resultado**, qué quedó sin verificar y por qué. Haz el commit y el PR según el flujo del proyecto.
