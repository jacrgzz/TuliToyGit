> **Implementado (12 nov 2026)** en la rama `estilo-dashboard`: tokens y Poppins (capas 1 y 2), utilidades `card` / `card-flat`,
> anillo `lib/ui/Ring.tsx`, barra lateral, ancho del contenido, entrada en ola, KPIs con anillo y en 2 filas, píldoras sin borde,
> barras redondeadas. Contraste medido: series 6.8:1 y 3.05:1 sobre blanco; gris `#5b4a7a` 6.5:1 sobre lila; textos de estado ≥ 5.5:1.
> **Búsqueda y campana (sección 6): implementadas** en la rama `busqueda-campana` (`_components/TopBar.tsx`, `TopBarClient.tsx`, lógica pura en `top-bar.ts`). Una letra sola en la búsqueda cuenta como palabra completa ("alumno a" no trae a "Alumno B"). Avisos: ruido alto ahora (solo docente), batería baja y juguetes sin datos en 24 h.

# Plan: estilo nuevo del dashboard (paleta de la landing)

> 12 nov 2026. Referencia visual: mockup [Dashboard de Tuli](https://claude.ai/artifact/9ZBCqZCwQckeMs3o2ap4nn), ya sin el cuadro morado de resumen.
> Objetivo: **solo cambia el estilo.** Se quedan todas las secciones y gráficas que existen, en el mismo orden y con los mismos datos y textos.

## Qué se toma del mockup

| Elemento | Cómo queda |
| --- | --- |
| **Paleta** | La de la landing de Angel. Fondo lila `#efe9fb`, tarjetas blancas, morado `#6341c4` (principal), `#7652d6` (secundario), `#4a2fa0` (texto activo), tinta `#2e1650`, gris morado `#5b4a7a`, bordes `#e2d9f3`, tinte `#ece6fb`, lila `#c9b1f5`, naranja `#ff8f3d`, durazno `#ffe7d2`, rosa `#ffd9ec` |
| **Tipografía** | Poppins (400/500/600/800) |
| **Tarjetas** | Blancas, esquinas de 24 px, borde lila suave, más aire (24 px de relleno). Se elevan un poco al pasar el cursor |
| **Títulos de sección** | Fuera de la tarjeta: título a la izquierda y una frase gris a la derecha |
| **Estados** (tranquilo, atención, alto, sin señal) | Píldoras con fondo claro y texto oscuro (verde, durazno, rosa, gris). Siempre con su palabra. Se pasa AA |
| **Porcentajes** | Anillo de progreso con el número al centro, como "Ambiente de hoy" |
| **Gráficas** | Línea morada gruesa, área en tinte lila, umbral en naranja punteado, momentos como puntos naranjas, barras redondeadas |
| **Barra lateral** | Blanca, con el selector de salón arriba, la píldora "Caja en línea", grupos con etiqueta (Salón · Personas y datos · Ayuda), activo en tinte lila y la tarjeta del usuario abajo |
| **Barra superior** | Búsqueda con ⌘K y campana de avisos (ver "Búsqueda") |
| **Animaciones** | Las tarjetas entran en ola, los anillos y las barras crecen, la línea del día se dibuja y el punto de "en línea" late. Todo se apaga con `prefers-reduced-motion` y al imprimir |

## Cómo se aplica (por capas, sin tocar datos)

### 1. Tokens: `apps/web/src/app/globals.css`

Hoy toda la app usa variables (`--brand`, `--muted`, `--border`, `--series-1`…), así que **cambiar los valores ya reviste casi todo.**

- `--background #efe9fb`, `--foreground #2e1650`, `--brand #6341c4`, `--brand-dark #4a2fa0`, `--muted #5b4a7a`, `--border #e2d9f3`.
- Nuevas: `--surface #fff`, `--surface-soft #fbf8ff`, `--tint #ece6fb`, `--lilac #c9b1f5`, `--peach #ffe7d2`, `--pink #ffd9ec`, y fondos y textos de estado (`--calm-bg`, `--attention-bg`, `--high-bg`, `--idle-bg`).
- **Semáforo** (`--calm`, `--attention`, `--high`): se queda como color de estado. Se ajustan los tonos para que pasen AA sobre sus fondos claros.
- **Gráficas:** `--series-1` pasa a morado `#6341c4` y `--series-2` a naranja `#ff8f3d`. `--chart-reference` a gris lila y `--chart-grid` a `#ece6fb`.
  - Se validan con `validate_palette.js` (skill dataviz), igual que el par actual: distinguibles con daltonismo y contraste ≥ 3:1.
  - Si el naranja se confunde con "atención", se oscurece.

### 2. Fuente: `apps/web/src/app/layout.tsx`

Poppins con `next/font` para toda la app, en lugar de Geist. Se queda Geist Mono para cifras en tablas. La landing ya la usa, así que se comparte.

### 3. Piezas comunes

Utilidades de Tailwind 4 (`@utility`) en `globals.css`. Así no se crea una librería de componentes nueva:

- `card`: sustituye `rounded-xl border border-border bg-white p-4`, que aparece unas 55 veces. Es un reemplazo mecánico.
- `card-soft`: para filas dentro de una tarjeta (listas de momentos, juguetes, niños).
- `pill`, más `pill-calm`, `pill-attention`, `pill-high`, `pill-idle` y `pill-tint`: sustituyen las etiquetas de estado con borde.
- `section-head`: el título de sección con su frase.
- `animate-rise`: la entrada en ola, con retraso por posición.
- Componente `Ring` (anillo de progreso) en `src/lib/ui/Ring.tsx`. Es puro y lo usan los KPI y las condiciones.

### 4. Estructura: `dashboard/layout.tsx`, `Sidebar.tsx`, `SidebarNav.tsx`

- El fondo de la página pasa a lila. El ancho máximo del contenido sube de `max-w-5xl` a `max-w-7xl`, con más margen.
- **Barra lateral con el estilo del mockup.** Se mantienen intactas:
  - las 3 formas que ya tiene: completa en escritorio, solo íconos en tableta e inferior en teléfono;
  - la navegación por rol;
  - `ClassroomPicker`.
- **Barra superior nueva** (`TopBar`), arriba del contenido, con la búsqueda y la campana.

### 5. Secciones, en el mismo orden

Ninguna cambia de lugar ni de datos. Solo se reviste.

| Página | Secciones (orden actual) | Qué cambia |
| --- | --- | --- |
| **Hoy** (docente) | Aviso en vivo · Condiciones ahora · KPIs · Esta semana · Un día en el salón · Niños del salón | Aviso: tarjeta con píldora de estado. Condiciones: tarjetas con anillo y valor. KPIs: anillo en los de %, número grande en "Momentos", con espacio de sobra. Semana: barras de comparación. Día: el gráfico con el estilo nuevo, con los momentos en naranja. Niños: filas `card-soft` |
| **Mi salón** | Perfiles · Ruido del salón (mapa de calor y tiempo en rojo) | Tabla con encabezado en tinte y filas suaves. Mapa de calor en escala lila→morado. Barras redondeadas |
| **Momentos / evento** | Lista, curva del evento, tabla de lecturas, nota | Lista en `card-soft` con hora en píldora. La curva usa el estilo nuevo |
| **Bitácora** | Formulario y lista | Campos redondeados, botón morado |
| **Niños** y sus pestañas (resumen, perfil, horarios, momentos, semana, reporte, ajustes) | Igual | Las pestañas pasan a píldoras. Las gráficas (tendencia, umbral, sensibilidad, combinaciones) toman la paleta nueva |
| **Familia** (Hoy, Su semana) | Igual | Mismas tarjetas, con lenguaje sencillo |
| **Reportes / impresión** | Igual | Al imprimir: fondo blanco, sin sombras ni animaciones |
| **Dispositivos** | Estado de juguetes y caja | Filas con píldoras de batería y señal |
| **Ayuda** | Igual | Tarjetas por tema |
| **Pantalla del salón** | Semáforo grande | Fondo morado, semáforo en blanco con su palabra |
| **Admin** | Panel | Solo tokens y `card` |
| **Login** | Igual | Fondo lila, tarjeta blanca y botón morado, para que combine con la landing |

### 6. Búsqueda y campana

- **Búsqueda:** se abre con ⌘K o con un clic. Busca **niños del salón elegido y secciones** del dashboard, filtrando en el cliente con datos que ya se cargan. No busca dentro de los momentos: para eso haría falta una consulta nueva y se deja para después. Es accesible: diálogo con `role="dialog"`, foco atrapado y Esc para cerrar.
- **Campana:** cuenta los avisos que ya existen: ruido alto en vivo, juguetes con batería baja y juguetes sin señal. Al abrirla muestra la lista con enlaces. Para la familia, solo lo de su hijo.

## Pasos

1. **Rama:** `estilo-dashboard`. Depende del código de los PR 13 a 15, así que conviene **mergearlos primero** y crearla desde `main`. Si no, se apila sobre `vista-tutor`.
2. Tokens, fuente y utilidades (capas 1 a 3). Con esto la app ya se ve morada.
3. Estructura: barra lateral y barra superior (capa 4).
4. Hoy y Mi salón (las páginas con más gráficas).
5. El resto de las páginas, la familia, el login y la pantalla del salón.
6. Búsqueda y campana.
7. Verificación y cierre.

## Verificación

- `npm run verify:all` en verde. No cambian datos ni textos, así que `check-pages` debe pasar igual.
- vitest para `Ring` (porcentaje a ángulo, límites 0–100) y para el filtro de la búsqueda.
- Validador de paleta de dataviz para el par de series nuevo. Contraste AA de todas las píldoras y del texto gris sobre lila.
- Revisión visual a 1280, 768 y 375 px con las 3 cuentas demo (docente, tutor y admin), con movimiento reducido y en vista de impresión del reporte.
- Cierre: commit, PR, Auto-fix, `para lusi.md`, memoria y `CLAUDE.md`. Hay que quitar la nota "tema mínimo; el rediseño viene después" de `globals.css`.

## Decisiones pendientes

1. **¿Poppins en toda la app**, o solo en títulos, con el texto en Geist?
2. **¿Mergear los PR 13 a 15 antes**, o apilar este trabajo encima?
3. **¿Búsqueda y campana en este PR**, o en uno aparte después del estilo?
4. **Marca:** esto cambia la marca de la app de naranja-rojo a morado. Conviene que Jac lo vea antes de mergear.

## Fuera de alcance

- Secciones o datos nuevos.
- Cambios de textos.
- La landing (ya tiene este estilo).
- Buscar dentro de los momentos.
