# Análisis para la vista del docente

Qué estadísticas y gráficas muestra (o mostrará) Tuli para ayudar a un docente a entender a cada niño, y **por qué se eligieron**, con fuentes. Las reglas no cambian: Tuli muestra **coincidencias, nunca diagnósticos**, y cada hallazgo lleva su nivel de evidencia.

Estado: la **Fase 1** (A1, A2, A3, A9, B4, C1), la **Fase 2** (A5, A6, A7, B1, B2, B3) y la **Fase 3a** (C3 bitácora, C4 notas y pulsación accidental, C5 antes y después) están implementadas. Fase 3b pendiente: A4, A8, C2, C6, C7.

## Cómo se calcula la Fase 1

- **Ventana:** los 5 minutos previos a cada momento (la misma de `event_context`).
- **Línea base comparable:** para no inflar la razón de coincidencia, la línea base usa **la misma ventana de 5 minutos**, pero anclada en cada lectura de la caja del salón durante el periodo. Se pregunta "¿en una ventana cualquiera de 5 min hubo un pico de ruido?", no "¿esta lectura suelta fue alta?".
- **Condiciones:** pico de ruido, ruido sostenido, cambio brusco de luz, luz muy intensa, calor y humedad alta. Los umbrales viven en `apps/web/src/lib/thresholds.ts` y se pasan a SQL.
- **Evidencia** (`features/insights/evidence.ts`):
  - *Insuficiente* si hay menos de 5 momentos con lecturas.
  - *Alta* si hay 10 o más momentos, el límite inferior de Wilson del % de momentos supera la línea base y la razón es de 1.5× o más.
  - *Media* si hay 5 o más momentos y la razón es de 1.5× o más.
  - *Sin coincidencia notable* en otro caso.
- **Funciones SQL** (migración `perfiles_docente`, todas `security invoker`, con RLS): `child_condition_lift`, `child_event_curve`, `classroom_profiles`.

## Cómo se calcula la Fase 2

- **Zona horaria:** todo se agrupa en hora de México (`America/Mexico_City`), no en UTC.
- **A5 (día × hora):** conteo de momentos por día de la semana y hora. El resumen solo afirma una franja si una ventana de 2 horas reúne el 45 % o más de los momentos y hay al menos 10. El mapa muestra de 6 a 18 h y avisa si hay datos fuera.
- **A6 (tendencia):** momentos por día hábil con promedio móvil de 7 días hábiles. **Un día sin lecturas de la caja es "sin datos", no cero**: una caja apagada no debe parecer una mejoría. El resumen compara los últimos 5 días con datos contra los 5 anteriores y exige 10 días con datos. "Similar" es una diferencia de hasta el 20 %.
- **A7 (episodios):** pulsaciones separadas por menos de 10 minutos forman un episodio (función de ventana `lag`).
- **B1 (línea del día):** ruido del salón en tramos de 5 min con una marca por cada momento de cualquier niño; `?dia=YYYY-MM-DD` (por defecto, el último día con lecturas).
- **B2 (ruido por hora):** % de lecturas con pico ≥ 75 dB por día de la semana y hora.
- **B3 (zona roja):** % de lecturas de cada día hábil con pico ≥ 75 dB.
- **Funciones SQL** (migración `horarios_tendencia_salon`, todas `security invoker`): `child_hourly_heatmap`, `child_daily_counts`, `child_episodes`, `classroom_noise_heatmap`, `classroom_daily_red`, `classroom_latest_day`, `classroom_day_timeline`, `classroom_day_events`. La lógica de frases está en `features/insights/patterns.ts`.

## Cómo funciona la Fase 3a (lo que el docente escribe)

- **Quién escribe:** solo el **docente del salón** (política RLS `is_teacher_of_classroom` / `is_teacher_of_child` / `is_teacher_of_event`). El admin sigue siendo de solo lectura; los tutores no escriben. Las escrituras usan el cliente **del usuario** (no `service_role`), así que RLS decide; además hay permisos **por columna**: no se puede cambiar `created_by`, ni mover una actividad a otro salón, ni reasignar una nota a otro momento.
- **C3 Bitácora** (`classroom_activities`): examen, recreo, música, lectura, cambio u otra, con inicio y fin (máx. 12 h) en hora de México (UTC−6). Aparece como franja gris en la línea del día. En cada niño, `child_activity_lift` trata la actividad como una condición más: ¿sus momentos ocurren más **durante** la actividad que el tiempo del salón que cae en ella? (misma razón e intervalo de Wilson que A1).
- **C4 Nota y pulsación accidental** (`event_notes`, una por momento): la nota solo la ven los **docentes del salón y el admin** (puede tener observaciones del aula). Una pulsación marcada como accidental **sale de todos los análisis para todos los roles por igual**, vía `accidental_event_ids()` (security definer que solo devuelve ids); el tutor ve la marca pero no la nota. La lista de momentos la muestra atenuada.
- **C5 Antes y después** (`interventions` + `child_intervention_compare`): compara momentos por día en los 14 días hábiles anteriores y posteriores a un cambio, contando solo días **con lecturas de la caja**. Pide 5 días de cada lado. Es un diseño AB descriptivo (como los de caso único del WWC): se dice siempre que **no demuestra que el ajuste sea la causa**, y las frases no usan "mejoría", "efecto" ni "funcionó".

## Catálogo de análisis y gráficas

### A. Por niño: "perfil de sensibilidad" (lo más importante)

| # | Análisis | Qué responde | Gráfica | Cálculo |
| --- | --- | --- | --- | --- |
| A1 | **Razón de coincidencia por condición** (*lift*) | "¿Qué condición aparece mucho más antes de sus momentos que en el resto del tiempo?" | Barras horizontales, una por condición (ruido alto, pico de ruido, cambio brusco de luz, luz alta, calor, humedad alta), con un marcador de la línea base | % de momentos con la condición en los 5 min previos ÷ % del tiempo del salón con esa condición. Por ejemplo, 80 % frente a 20 % = **4× más frecuente** |
| A2 | **Nivel de evidencia** | "¿Puedo confiar en esto?" | Etiqueta junto a cada barra | Intervalo de Wilson del % de momentos y mínimo de 5 momentos. *Alta* si el límite inferior supera la línea base y n ≥ 10, *media* si n ≥ 5, *insuficiente* en otro caso |
| A3 | **Curva antes y después del momento** (promedio alineado al evento) | "¿El ruido sube antes de que use el juguete?" | Líneas: ruido promedio de −10 a +5 min alrededor de cada momento, con una banda gris del rango normal del salón | Promediar lecturas por tramos de 30 s relativos a cada pulsación |
| A4 | **Umbral personal** | "¿A partir de cuántos dB empieza a coincidir?" | Dos histogramas superpuestos: pico de ruido antes de los momentos frente a todos los picos del salón | Distribuciones; se marca el percentil donde se separan |
| A5 | **Cuándo ocurre** | "¿Hay horas o días difíciles?" (recreo, después de comer, lunes) | Mapa de calor día × hora (zona horaria de México) | Conteo de momentos por bloque de 1 h |
| A6 | **Tendencia** | "¿Va mejorando o empeorando?" | Línea de momentos por día o semana | Conteo por día con media móvil de 7 días |
| A7 | **Episodios** (no pulsaciones sueltas) | "¿Fueron 10 momentos o un solo episodio largo?" | Línea de tiempo con barras de episodio | Pulsaciones a menos de 10 min entre sí = un episodio (función de ventana `lag`), con duración y número de pulsaciones |
| A8 | **Combinaciones** | "¿Solo cuando hay ruido Y la luz cambia?" | Tabla 2 × 2 con colores | Coincidencia de pares de condiciones frente a la línea base |
| A9 | **Resumen en lenguaje simple** | Lo anterior en 2 o 3 frases | Tarjeta de texto | Plantillas a partir de A1, A2 y A5. Por ejemplo: "Sus momentos coinciden 4× más a menudo con ruido alto (evidencia alta). Suelen ser entre 10 y 12 h." |

### B. Por salón: lo que el docente puede cambiar

| # | Análisis | Gráfica |
| --- | --- | --- |
| B1 | **Línea del día**: ruido y luz del salón, con los momentos de todos los niños marcados encima | Línea de tiempo con puntos por niño (alias) |
| B2 | **Mapa de ruido del salón** por día × hora: cuándo el salón es más ruidoso | Mapa de calor |
| B3 | **Tiempo en zona roja**: % del día con ruido ≥ 75 dB, por día | Barras por día |
| B4 | **Tabla de perfiles**: cada niño con su condición más asociada, nivel de evidencia y tendencia | Tabla ordenable (la "vista de un vistazo") |
| B5 | **Condiciones del salón asociadas a más momentos** (todos los niños juntos) | Barras de *lift* agregadas |

### C. Funciones para la vista del docente

| # | Función | Para qué |
| --- | --- | --- |
| C1 | Selector de periodo: 7, 30 o 90 días | Todos los análisis respetan el rango |
| C2 | **Aviso en vivo**: ruido alto sostenido (≥ 2 min) con niños de perfil "sensible al ruido" en el salón | Actuar antes (bajar el ruido, ofrecer un espacio tranquilo). Lenguaje neutral |
| C3 | **Bitácora de actividades**: marcar bloques del día (examen, recreo, música, cambio de salón) | La actividad se vuelve otra "condición" en A1 |
| C4 | **Nota en un momento** y "marcar como pulsación accidental" | Contexto y exclusión del análisis |
| C5 | **Antes y después de un ajuste** (por ejemplo, cambió de lugar o usa audífonos): marcar la fecha y comparar la tasa de momentos y el *lift* | Medir si un ajuste ayudó |
| C6 | **Exportar reporte** (PDF o CSV) por niño y periodo, para tutores o especialistas | Con el aviso de que no es diagnóstico |
| C7 | **Estado de los juguetes** del salón: sin señal o batería baja (cuando el firmware la envíe) | Evitar "no tuvo momentos" cuando en realidad el juguete estaba apagado |

---

## Justificación científica de la selección

Idea central: Tuli hace lo que en análisis de conducta se llama una **evaluación descriptiva de antecedentes**. Se registra *qué pasaba en el ambiente antes* de cada momento, sin afirmar causas. Cada análisis se eligió porque responde una pregunta concreta del docente y tiene respaldo en un método establecido.

### Por qué enfocarse en el ruido y la luz (el "qué" se mide)

- **La sobre-respuesta sensorial es frecuente en el autismo.** El metaanálisis de Ben-Sasson et al. (2009, *J Autism Dev Disord* 39:1–11; 14 estudios) encuentra diferencias significativas en la modulación sensorial frente a niños con desarrollo típico, incluida la sobre-respuesta, y mayores entre los 6 y 9 años. Esa es justo la edad escolar de Tuli.
- **La sobre-respuesta sensorial y la ansiedad están relacionadas**, posiblemente en ambas direcciones (Green y Ben-Sasson, 2010, *J Autism Dev Disord* 40(12)). Eso justifica mirar *condiciones sensoriales previas* a los momentos de malestar, y obliga a hablar de **coincidencias, no de causas**.
- **El ruido del salón afecta la conducta de niños con autismo.** En un estudio observacional con 42 niños de 6 a 9 años, los salones ruidosos se asociaron con más conductas y habla repetitivas (Kanakri et al., 2017, *Environment and Behavior*). Además, los docentes consideran el control del ruido un tema importante (Kanakri et al., 2017, *Res Dev Disabil* 63). Ambos son estudios exploratorios con muestras pequeñas, así que sirven como motivación, no como prueba.
- **Por qué 75 dB como "ruido alto".** Los salones ocupados de primaria van de unos 56 dB(A) en actividades tranquilas a unos 77 dB(A) en las más ruidosas, con un "murmullo de alumnos" típico cercano a 65 dB(A) (Shield y Dockrell; UCL y Salford). Así que 75 dB marca el rango de las actividades más ruidosas. La norma ANSI S12.60 (35 dBA) aplica a salones **vacíos**, por eso no sirve como umbral para un salón con alumnos. **El umbral sigue siendo provisional** y debe validarse con especialistas (OE1).

### Por qué cada análisis (el "cómo" se analiza)

| Análisis | Justificación | Fuente |
| --- | --- | --- |
| **A1 Razón de coincidencia** (*lift*) | Es la idea de la **probabilidad condicional frente a la de fondo** que se usa en la evaluación descriptiva de conducta: comparar qué tan seguido aparece una condición antes de la conducta contra qué tan seguido aparece en general. Sin la línea base, "80 % de sus momentos tuvieron ruido" no dice nada si el salón es ruidoso el 80 % del tiempo | Método ABC y de probabilidad condicional (Bijou, Peterson y Ault, 1968); comparación de métodos descriptivos en Pence et al. (*JABA*, PMC2695353) |
| **A2 Evidencia con intervalo de Wilson** | Con pocos casos el porcentaje simple engaña. El intervalo de Wilson es el **recomendado para n pequeño (≤ 40)**, porque el intervalo clásico (Wald) tiene una cobertura errática | Brown, Cai y DasGupta (2001), *Statistical Science* 16(2) |
| **A3 Curva antes y después del momento** | Es el **análisis de épocas superpuestas** (*superposed epoch analysis*): alinear los segmentos alrededor de cada evento y promediarlos. El ruido aleatorio se cancela y el patrón repetido aparece (el ruido baja aproximadamente con √n). Se usa en geofísica y neurociencia para el mismo problema | Superposed epoch analysis / método de Chree (AMS Glossary); Walton y Murphy (2022), *Front. Astron. Space Sci.* |
| **A5 Mapa de calor día × hora** | Es el **diagrama de dispersión de Touchette**, una herramienta clásica para encontrar en qué horas, actividades o personas se concentra una conducta. El argumento original: promediar en una línea **oculta** los cambios de frecuencia que revelan qué la controla. En una replicación, 12 de 15 conjuntos de datos mostraron intervalos de 30 min con mayor probabilidad | Touchette, MacDonald y Langer (1985), *JABA* 18(4):343–351; replicación de 1998 en *JABA* |
| **A6 Tendencia** y **C5 antes y después de un ajuste** | El registro repetido de un mismo niño, comparando fases (antes y después de un cambio) por **nivel y tendencia**, es la lógica de los **diseños de caso único**, el estándar para evaluar intervenciones con un solo participante en educación especial. Se presenta como observación: un diseño AB por sí solo no demuestra efecto | What Works Clearinghouse, *Single-Case Design Technical Documentation* (Kratochwill et al., 2010) |
| **A7 Episodios** y el registro con el juguete | El juguete es un **registro por evento en el momento**, en el ambiente natural. Esa es la base de la **evaluación ecológica momentánea (EMA)**, que reduce el sesgo de memoria de los reportes retrospectivos. Agrupar pulsaciones cercanas evita contar varias veces un mismo episodio | Shiffman, Stone y Hufford (2008), *Annu Rev Clin Psychol* 4:1–32 |
| **C3 Bitácora de actividades** | En la evaluación descriptiva, la actividad del momento es un antecedente de primer nivel, junto con la hora y las personas | Touchette et al. (1985); Bijou et al. (1968) |
| **Tipo de gráfica: barras con escala común**, no pasteles ni medidores | Juzgar una **posición sobre una escala común** es la tarea visual más precisa. Las barras horizontales con la línea base marcada aprovechan eso; los ángulos y áreas se leen peor | Cleveland y McGill (1984), *JASA* 79:531–554; replicado por Heer y Bostock (2010) |

### Límites que la interfaz debe decir (y por qué)

- La **evaluación descriptiva no identifica la función ni la causa** de una conducta. Solo un análisis funcional controlado puede hacerlo (Pence et al.). Por eso Tuli dice "coincide" y "aparece más a menudo", nunca "causa".
- Los estudios sobre ruido y autismo son **exploratorios y de muestras pequeñas**. Los umbrales son provisionales hasta validarlos con especialistas.
- Una pulsación del juguete es una **señal de malestar autorreportada**, no una medición clínica de ansiedad.

### Fuentes

- Ben-Sasson et al., 2009: [PubMed 18512135](https://pubmed.ncbi.nlm.nih.gov/18512135/)
- Green y Ben-Sasson, 2010: [Universidad de Haifa](https://cris.haifa.ac.il/en/publications/anxiety-disorders-and-sensory-over-responsivity-in-children-with-/)
- Kanakri et al., 2017, encuesta: [resumen IMFAR](https://imfar.confex.com/imfar/2017/webprogram/Paper24926.html) · estudio observacional: [Texas A&M](https://newsarchive.arch.tamu.edu/news/2012/7/31/autism-acoustics-impact/index.html)
- Shield y Dockrell, niveles en salones: [UCL 2004](https://discovery-pp.ucl.ac.uk/1479274/1/Shield2004External730.pdf) · [UCL 2006](https://discovery-pp.ucl.ac.uk/10000779/1/Dockrell2006Acoustical509.pdf)
- ANSI S12.60: [Larson Davis](https://www.larsondavis.com/learn/building-acoustics/ansi-standards-for-classroom-acoustics)
- Pence et al., métodos descriptivos: [PMC2695353](https://pmc.ncbi.nlm.nih.gov/articles/PMC2695353)
- Brown, Cai y DasGupta, 2001: [Project Euclid](https://projecteuclid.org/euclid.ss/1009213286)
- Épocas superpuestas: [AMS Glossary](https://glossary.ametsoc.org/wiki/superposed-epoch-method/) · [Walton y Murphy, 2022](https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2022.1000145/pdf)
- Touchette et al., 1985: [PMC1308031](https://pmc.ncbi.nlm.nih.gov/articles/PMC1308031/)
- WWC, diseños de caso único: [ERIC ED510743](https://files.eric.ed.gov/fulltext/ED510743.pdf)
- Shiffman et al., 2008: [PubMed 18509902](https://pubmed.ncbi.nlm.nih.gov/18509902/)
- Cleveland y McGill, 1984: [resumen Cornell](https://info3312.infosci.cornell.edu/ae/graphical-perception-A.html)

> Nota: varias fuentes se verificaron por su resumen y no por el texto completo. Antes de citarlas en el reporte del curso, revisar el artículo original (DOI incluido donde lo hay).
