# Vista del padre de familia (tutor)

> **Fase 1 hecha** (11 nov 2026, rama `vista-tutor`). Fases 2 y 3 pendientes.
>
> **Qué se hizo en la fase 1:**
> - Pestañas de la familia: Hoy (la ruta `resumen`), Su semana (`semana`), Momentos y Reporte (`childTabsFor` en `nav-items.ts`). El docente y el admin no cambian.
> - Hoy: tarjetas «Cómo le va hoy» (rango habitual del propio niño, de `child_daily_counts`), «El salón hoy» (`classroom_daily_stats`) y «Su juguete» (`features/devices/care.ts`).
> - Su semana: días de la semana, comparación con el mismo tramo de la semana anterior, días «igual o menos que de costumbre» (mediana de las 4 semanas previas), lo que más coincidió en una frase y preguntas para el docente. Enlaza al perfil y a los horarios.
> - «Mis niños» con la frase de hoy de cada niño; Ayuda con la sección «Para familias» (`#familias`), visible solo para el tutor.
> - Lógica pura en `features/insights/family.ts` (pruebas en `family.test.ts`); umbrales `FAMILY` en `lib/thresholds.ts` (provisionales).

## 1. Cómo está hoy

- **Un solo niño:** al entrar, va directo a su ficha (`/dashboard/ninos/[id]/resumen`). Con varios niños ve "Mis niños".
- **Ve las mismas 6 pestañas que el docente:** Resumen, Perfil, Horarios, Momentos, Ajustes y Reporte. No hay nada pensado para la familia:
  - Perfil enseña barras de "lift", intervalos, umbral en dB y combinaciones. Son útiles para el docente o un especialista, pero difíciles de leer para un papá.
  - Ajustes la ve, pero no puede escribir.
- **No puede escribir nada.** Las notas del docente las ve solo el docente; eso fue a propósito, porque pueden tener observaciones del aula.
- **No hay comunicación casa ↔ escuela**, ni resumen semanal, ni avisos.
- **Lo que sí funciona bien y se mantiene:** RLS (solo ve a su hijo), Realtime, el reporte imprimible y el CSV.

**Problema principal:** la vista del tutor es una copia técnica de la del docente. Responde "¿qué condición coincide con qué?", pero el papá pregunta otras cosas:
1. ¿Cómo le fue hoy?
2. ¿Va mejor o peor?
3. ¿Qué puedo hacer yo?
4. ¿Su juguete funciona?

---

## 2. Principios (de la evidencia)

| Principio | Por qué | Fuente |
| --- | --- | --- |
| **Lenguaje de fortalezas, no de déficit** ("3 días tranquilos esta semana" antes que "12 momentos") | Cuando los educadores hablan de fortalezas, los padres muestran más emoción positiva y mejor interacción con el niño; enfocarse en déficits produjo más frases negativas sobre el niño. Muestra pequeña; evidencia prometedora, no definitiva | [Mossman 2011](https://reachfamilies.umn.edu/sites/default/files/rdoc/Mossman_2011_0.pdf); narrativas basadas en fortalezas asociadas a más esperanza y satisfacción de cuidadores ([SAGE 2025](https://journals.sagepub.com/doi/10.1177/13623613251325287)) |
| **Comunicación breve y frecuente de la escuela a la casa** | Mensajes semanales cortos del docente a los padres redujeron el ausentismo y en un 41 % los alumnos que reprobaban (Kraft y Rogers). Alertas automáticas sobre tareas y faltas redujeron reprobación en ~38 % en otro experimento | [Kraft 2017 (ASCD)](https://ascd.org/el/articles/engaging-parents-through-better-communication-systems); [WSIPP](https://wsipp.wa.gov/BenefitCost/Program/1004); [Bergman y Chan](https://conference.iza.org/conference_files/EcoEdu_2017/chan_e25715.pdf) |
| **La colaboración familia–escuela funciona mejor en las dos direcciones** | Metaanálisis de intervenciones de consulta familia–escuela: efectos en competencia socioconductual (δ ≈ 0.34), salud mental (δ ≈ 0.37) y logro (δ ≈ 0.27). En las tarjetas de reporte diario, más participación del hogar se asocia a mejores resultados | [IES / Sheridan y Smith](https://ies.ed.gov/use-work/awards/meta-analysis-parent-involvement-interventions-and-family-school-partnerships-effects-student); [Smith et al. 2020, *Educ. Psych. Review*](https://katalog.lib.cas.cz/KNAV/EdsRecord/edsjsr,edsjsr.48728564); [WSIPP, reportes diarios](https://wsipp.wa.gov/BenefitCost/ProgramPdf/533/Daily-Behavior-Report-Cards) |
| **Pocas notificaciones, y nunca alarmas en tiempo real al papá** | En un estudio con 62 padres (293 notificaciones al día), las veces que el teléfono hacía que lo tomaran se asociaron con más estrés diario. El papá no está en el salón y no puede actuar en ese momento | [Munzer et al. 2024 (Michigan Medicine)](https://michiganmedicine.org/health-lab/parents-who-frequently-pick-phones-due-device-notifications-may-be-more-stressed) |
| **Nunca comparar con otros niños, nunca diagnóstico** | Ya es regla del proyecto; con familias pesa más | `CLAUDE.md` |

> Los números de Sheridan/Smith salen del resumen de un metaanálisis relacionado (consulta familia–escuela), no del artículo de 2020 en sí. Hay que revisar el original antes de citarlo en el reporte del curso.

---

## 3. Propuestas

### Fase 1: vista propia del tutor (sin migración, solo lectura)

1. **Inicio del tutor: "Cómo le fue hoy".** Una tarjeta por niño, en frases sencillas:
   - "Hoy usó su juguete 3 veces; lo habitual en él es entre 2 y 6." (misma lógica que el KPI K1 del docente, pero con la línea base **del niño**, de `getDailyCounts`.)
   - "El salón estuvo tranquilo la mayor parte del día" (con `classroom_daily_stats`; el tutor ya puede leer las lecturas del salón de su hijo por RLS).
   - Con pocos datos: "Hoy todavía no hay suficientes datos".
   - Los momentos nunca en rojo.
2. **Su semana, en positivo.** Resumen semanal del niño: días tranquilos (días con menos momentos que su habitual), comparación con la semana anterior en números y sin flechas de juicio, y "lo que más coincidió" en una frase solo si la evidencia es media o alta.
3. **Pestañas más simples para el tutor:** Hoy, Su semana, Momentos, Reporte. El Perfil técnico (barras, umbral, combinaciones) queda dentro de un "Ver el análisis detallado" para quien quiera más, con una frase de lectura arriba de cada gráfica. El docente no cambia.
4. **Juguete en casa.** El papá es quien lo carga. Tarjeta "Juguete: cargado / cárgalo esta noche / sin señal desde ayer", con `ToyStatus` y `battery_pct` (cuando el firmware la mande). Incluye "Cómo cargarlo y encenderlo".
5. **Ayuda para familias.** Página propia: qué es un "momento", qué no significa, cómo hablar de esto con el niño sin presionarlo, y **preguntas sugeridas para la reunión con el docente** ("¿Qué actividad había a las 10?", "¿Qué le ayuda a calmarse en el salón?").

**Estado:** hecha. **Esfuerzo:** medio. Reutiliza `kpis.ts`, `patterns.ts`, `getDailyCounts` y `classroom_daily_stats`. Pruebas: vitest de las frases (incluida la prueba de "sin palabras clínicas"), `check-pages` del tutor.

### Fase 2: casa ↔ escuela (con migración y primeras escrituras del tutor)

6. **Nota de casa.** Antes de clases o al terminar el día, el tutor marca en 10 segundos cómo amaneció: "Durmió bien / poco", "Mañana tranquila / difícil", "Hubo un cambio en casa" + nota opcional corta. Lo ve el docente junto a "Hoy".
   - **Por qué:** da contexto que la caja no mide (un mal día puede empezar en casa) y hace la colaboración de dos vías.
   - Tabla nueva `home_checkins` (una por niño y día), RLS: escribe solo el tutor del niño; leen el tutor y los docentes del salón; admin solo lectura.
   - **Cuidado:** no pedir datos de salud (medicamentos, diagnósticos). Opciones cerradas y nota corta con aviso.
7. **Mensaje del docente para la familia.** El docente puede marcar una nota o un ajuste como "compartir con la familia" (columna nueva `shared_with_family`). La familia ve solo lo marcado. Ejemplo: "Esta semana lo sentamos lejos de la ventana".
8. **Ajustes hechos en casa.** El tutor puede registrar un cambio de rutina en casa en `interventions` (con `origen = casa`), y ambos ven el "antes y después" con la misma advertencia de que no prueba causa.

**Esfuerzo:** alto. Migración con `nueva-migracion`, políticas nuevas, pruebas en `check-rls` (otro tutor no lee ni escribe; el docente no escribe la nota de casa), `check-pages` y acciones del servidor. Requiere el aviso de privacidad antes de usarse con familias reales.

### Fase 3: resumen periódico (cuando haya despliegue)

9. **Resumen semanal opcional** (viernes por la tarde), por correo o notificación push, desactivado por defecto. Una sola notificación a la semana, nunca alertas en vivo al tutor. Requiere service worker o un servicio de correo, y que la app esté desplegada.
10. **"Tus datos".** Qué se recoge, quién lo ve, descargar todo (ya existe el CSV) y cómo pedir que se borre. Lo pide la LFPDPPP (derechos ARCO) y da confianza a la familia.

---

## 4. Qué NO agregar (y por qué)

- **Alertas en tiempo real al papá:** generan estrés y no puede actuar desde fuera del salón. El aviso en vivo se queda solo para el docente.
- **Comparaciones con otros niños o con "el promedio del salón":** señalan al niño y no ayudan.
- **Puntuaciones o "niveles de ansiedad":** sería lenguaje clínico.
- **Ver las notas privadas del docente:** solo lo que él decida compartir.

## 5. Orden recomendado

1. Fase 1 completa (un PR): es la mejora más grande para el papá y no toca la base de datos.
2. Fase 2, puntos 6 y 7 (un PR, con migración). El 8 después.
3. Fase 3 cuando esté el despliegue en Vercel y el aviso de privacidad.

**Pendiente de validar con Jac (diseño) y, si se puede, con 2 o 3 familias:** qué palabras entienden mejor ("momento", "pulsación", "día tranquilo") y si la nota de casa les cabe en la rutina de la mañana.
