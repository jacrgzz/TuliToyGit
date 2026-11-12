# Landing de Tuli con el diseño de Angel

> 11 nov 2026. Fuente: `~/Desktop/tuliToy/tuli-testview` (diseño de Angel Cervantes) y sus 2 audios de WhatsApp.
> **Implementado** en la rama `landing-angel`. Decisiones tomadas: paleta morada de Angel (Lucy), textos reales
> de la propuesta de abajo, el botón del control de juego pasó a "Entrar" y la carga es blanca, como pidió Angel.
> Código: `apps/web/src/features/landing/` (`content.ts`, `motion.ts`, `components/`), modelos en
> `apps/web/public/models/landing/`. Pruebas: `landing.test.ts` y la sección "Sin sesión" de `check-pages`.

## Qué pidió Angel (audios)

1. **Los modelos 3D están en `public/models/testview/`** (`osito-v2.glb`, 2.1 MB, y `ojo.glb`, 170 KB). Hay que copiarlos.
2. **Lo que faltó: la pantalla de carga.** El modelo tarda un poco en cargar. Propone:
   - mientras carga, una pantalla **blanca con el nombre de la marca de fondo**;
   - cuando termine, la parte **morada se abre desde el centro** hacia los lados y aparece toda la información.

## Qué trae el diseño

- **Hero con un osito 3D** (three.js con React Three Fiber):
  - te sigue con la mirada, parpadea y respira;
  - saluda cada ~7 s;
  - al hacerle clic rebota y suena;
  - se le pueden jalar las patitas, que regresan con rebote de peluche.
- **Hero que se vuelve grid con el scroll.** El fondo morado ya son 7 tarjetas pegadas. Al bajar:
  - se separan y se redondean;
  - cada una toma su color en ola;
  - el osito, el título y el menú se desvanecen.
- Escritorio: grid 4×3 tipo bento. Teléfono: 2×4.
- Tipografía Poppins, paleta morada, menú en 3 columnas y dos botones redondos (logo y control de juego).
- Rendimiento ya cuidado:
  - three solo en el cliente;
  - el osito deja de dibujarse cuando sale de pantalla;
  - sonidos sintetizados, sin archivos.

## Diferencias con nuestro repo (lo que hay que adaptar)

| Tema | Diseño de Angel | Repo de Tuli | Qué hacer |
| --- | --- | --- | --- |
| Versiones | Next 15, React 18, Tailwind 3 | Next 16 (Cache Components), React 19, Tailwind 4 | Instalar `three@0.186`, `@react-three/fiber@9` y `@react-three/drei@10` (ya son compatibles con React 19). Las clases de Tailwind que usa sirven igual en la v4 |
| Arquitectura | Todo en `app/testview/_components` | `app → features → lib` | Pasarlo a `src/features/landing/` (componentes y escena) y que `app/page.tsx` solo lo componga |
| Código de depuración | `bakeRig.ts`, `eyeFit.ts`, parámetros `?pose`, `?lids`, `?eyefit`, `window.__osito`, `console.info` | No va a producción | No copiar `bakeRig.ts` ni `eyeFit.ts` (usa modelos `_src` que no vienen). Quitar parámetros, `window.__osito` y logs. Dejar las medidas finales como constantes |
| Textos de las tarjetas | "Comprar", "Juegos", "Progreso", "Soporte por chat todos los días", "Registrarse", "Un peluche que juega, aprende y crece contigo", "Rutinas, emociones y lenguaje" | Tuli no vende en línea, no tiene juegos, ni chat, ni registro abierto, y no promete beneficios emocionales (skill `marca-tuli`) | Reescribir con lo que Tuli sí hace (propuesta abajo). Nada de promesas que no existen |
| Enlaces | Todos `href="#"`; el botón de control no hace nada | | Cada tarjeta y enlace lleva a algo real: `/login` o una sección de la página |
| Aviso | No lo tiene | Obligatorio: "no es un dispositivo médico" (`check-pages` lo exige) | Agregarlo al pie |
| Colores | Morado (`#6341c4`, `#ad8beb`…) y naranja `#ff8f3d` | Marca naranja-rojo `#DB4A2B` (aproximado, pendiente de Jac) | **Decisión tuya y de Jac** (ver Decisiones) |
| Fuente | Poppins | Geist | Poppins solo en la landing con `next/font` (la app sigue igual), o en todo si Jac lo decide |
| Nombre | "Tuli Toy" | En la UI "Tuli" | Usar "Tuli" en el título. "Tuli Toy" puede ir en el logo |

## Propuesta de tarjetas (mismo grid, contenido real)

En el mismo orden de la ola. Cada tarjeta enlaza a una sección de abajo o a una página que existe.

| # | Título | Texto | Enlace |
| --- | --- | --- | --- |
| 1 (grande) | Conoce a Tuli | Un juguete para apretar y una caja que escucha el salón, sin grabar. | `#que-es` |
| 2 | Cómo funciona | Juguete, caja y panel: tres pasos. | `#como-funciona` |
| 3 (alta) | Para familias | Mira cómo le fue en el día, en lenguaje sencillo. | `#familias` |
| 4 | Para docentes | El ambiente del salón y lo que se repite. | `#docentes` |
| 5 | Privacidad | No graba audio ni usa cámaras. | `#privacidad` |
| 6 (ancha) | Entrar | Si tu escuela ya usa Tuli, entra aquí. | `/login` |
| 7 | Preguntas | Lo que Tuli hace y lo que no. | `#preguntas` |

**Menú:**
- Columna 1: Inicio, Qué es, Cómo funciona, Preguntas.
- Columna 2: Familias, Docentes, Privacidad.
- Columna 3, "Mi cuenta": Iniciar sesión.

**Botones redondos:** el del logo lleva arriba. El del control de juego se quita, o se cambia por "Entrar" (no hay juegos).

**Debajo del grid** van secciones cortas con esos `id`. Reutilizan los textos que ya existen en la landing actual (los 3 pasos y el aviso) y la sección "Para familias" de Ayuda.
- Así el texto lo leen los buscadores y los lectores de pantalla, aunque el 3D no cargue.
- Al final, el pie con el aviso médico.

## Pantalla de carga (lo que pidió Angel)

1. **Al abrir:** pantalla blanca (o crema de la marca) con "Tuli" grande al centro. Se dibuja desde el servidor, sin esperar a JavaScript.
2. **Mientras carga:**
   - se descargan three y los dos modelos;
   - el progreso sale de `useProgress` de drei;
   - un detalle sutil indica que avanza (una barra fina o el nombre que se llena), para que no parezca trabado.
3. **Al terminar** (modelo listo y primer cuadro dibujado):
   - el escenario morado se abre **desde el centro** con un `clip-path` que crece (de una franja o un círculo al rectángulo completo), unos 700 ms;
   - después entran el título, el menú y los botones.
4. **Casos que hay que cubrir:**
   - **Si tarda más de ~6 s** (conexión lenta) **o el navegador no tiene WebGL:** se abre igual, sin osito o con una imagen fija de él. Nunca se queda en blanco.
   - **`prefers-reduced-motion`:** sin la apertura animada (aparece con un fundido corto) y el grid se muestra ya abierto, sin animación de scroll.
   - **Sin JavaScript:** el contenido de abajo se lee completo. La pantalla de carga solo se monta si hay JS.
5. **Recargar la página** muestra la carga otra vez, pero rápido (el navegador ya tiene los modelos en caché).

## Accesibilidad y rendimiento

- **Teléfono:** el menú de 3 columnas está oculto y no hay alternativa. Agregar un botón "Menú" (o confiar en las tarjetas y el pie).
- **Encabezados:** un `h1`, un `h2` por sección y las tarjetas como `h2` o `h3` en orden.
- **Lectores de pantalla:** el canvas lleva `aria-hidden`, y hay una descripción en texto ("Ilustración de Tuli, un osito que saluda").
- **Contraste AA** en todas las tarjetas. Hay que revisar sobre todo el texto blanco sobre `#ff8f3d` y `#8f6be0`.
- **Peso:**
  - three ronda los 600 KB de JS y el osito 2.1 MB;
  - solo se cargan en `/`, con `dynamic(..., { ssr: false })`;
  - `useGLTF.preload` y `<link rel="preload">` para los `.glb`;
  - revisar si el osito se puede comprimir más (Draco o meshopt) sin perder calidad.
- **Sonido:** solo después de un clic (ya es así). Agregar un botón para silenciar.
- **Lint del repo** (`react-hooks` 7 es más estricto que en el diseño):
  - mutar `lidCut.value` u objetos de `useMemo` dentro de `useFrame` puede marcar error;
  - se resuelve con `useRef` en vez de `useMemo` para esos valores.

## Pasos de implementación

1. **Rama:** `landing-angel`, **desde `main`**, para que no dependa de los PR 13 a 15. La landing no toca nada de esos cambios.
2. **Dependencias:** `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`, con versiones fijas como en el diseño.
3. **Modelos:** copiar a `apps/web/public/models/landing/`.
4. **Código:**
   - `src/features/landing/`:
     - `HeroGrid.tsx`
     - `scene/OsitoScene.tsx`, `scene/OsitoCanvas.tsx`, `scene/view.ts`, `scene/sound.ts`
     - `icons.tsx`
     - `LoadingCurtain.tsx` (nuevo)
     - `content.ts`, con textos y enlaces en un solo lugar
   - Sin el código de depuración.
5. **Página:** `app/page.tsx` arma el hero, las secciones de abajo y el pie con el aviso. `metadata` con título "Tuli" y la descripción actual.
6. **Pantalla de carga y apertura desde el centro:** con su respaldo por tiempo y sin WebGL, y con movimiento reducido.
7. **Textos** según la propuesta, revisados con la skill `marca-tuli` (sin lenguaje clínico, sin promesas).
8. **Créditos:** "Diseño de la landing: Angel Cervantes" en el PR y en `docs/landing.md`.
9. **Pruebas:**
   - vitest para las funciones puras (`smooth`, cálculo de la ola y de la apertura, contenido sin palabras clínicas y sin enlaces `#` vacíos);
   - `check-pages`: la landing da 200, trae el aviso, enlaza a `/login` y tiene las secciones;
   - `npm run verify:all` en verde;
   - revisión visual a 1280, 768 y 375 px; con movimiento reducido; y con WebGL apagado.
10. **Cierre:** commit, PR, Auto-fix y actualizar `para lusi.md`, la memoria y `CLAUDE.md`.

## Decisiones que necesito de ti (y de Jac)

1. **Colores:** ¿la landing queda morada como la de Angel, o se pasa al naranja-rojo de la marca? ¿O la marca cambia a morado en toda la app? Jac debería decidirlo.
2. **Textos de las tarjetas:** ¿te sirve la propuesta de arriba? ¿Hay algo real que agregar, como contacto o una página de compra futura?
3. **El botón del control de juego:** ¿se quita o se vuelve "Entrar"?
4. **Fondo de la carga:** ¿blanco puro, como dijo Angel, o el crema de la marca (`#fffaf7`)?

## Fuera de alcance

- Tienda, registro abierto, juegos y chat de soporte: no existen. Si algún día se hacen, se agregan sus tarjetas.
- Rediseño del dashboard con la nueva paleta: es otro trabajo, con Jac.
