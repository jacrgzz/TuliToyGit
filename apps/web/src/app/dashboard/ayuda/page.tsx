import { Suspense } from "react";
import { getViewerRole } from "@/features/auth/queries";
import { meetingQuestions } from "@/features/insights/family";
import { KPI, PATTERNS, THRESHOLDS } from "@/lib/thresholds";

// Para familias (solo el tutor la ve arriba de todo). Consejos generales de acompañamiento, sin
// lenguaje clínico. Ver docs/vista-tutor.md.
async function FamilyHelp() {
  if ((await getViewerRole()) !== "guardian") return null;
  return (
    <section id="familias" className="space-y-3 scroll-mt-4 rounded-xl border border-border bg-white p-4">
      <h2 className="text-lg font-semibold">Para familias</h2>
      <div className="space-y-1">
        <h3 className="font-semibold">Usar el juguete no es algo malo</h3>
        <p>
          Cada vez que tu hijo aprieta su juguete se guarda un momento. Buscar el juguete puede ser su forma de acomodarse a lo que pasa
          a su alrededor. Tuli solo ayuda a ver en qué momentos lo buscó y cómo estaba el salón.
        </p>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold">Qué no significa</h3>
        <p>
          Tuli no mide emociones ni da diagnósticos, y nunca compara a tu hijo con otros niños: siempre lo compara con sus propios días.
          Un día con más momentos no es un mal día.
        </p>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold">Cómo platicarlo en casa</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Pregunta con curiosidad y sin presionar; está bien si no quiere hablar de eso.</li>
          <li>No uses los datos como premio o castigo.</li>
          <li>Fíjate también en lo que sí le funciona: los días y las horas en que estuvo a gusto.</li>
        </ul>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold">Para la reunión con su maestra o maestro</h3>
        <ul className="list-disc space-y-1 pl-5">
          {meetingQuestions(null).map((q) => (
            <li key={q}>{q}</li>
          ))}
          <li>Lleva el reporte de Tuli (pestaña «Reporte»): se puede imprimir o guardar como PDF.</li>
        </ul>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold">Su juguete en casa</h3>
        <p>
          Si Tuli dice que le queda poca batería, conéctalo con su cable USB por la noche. Antes de ir a la escuela, revisa que esté
          encendido con su interruptor. El juguete solo envía señal cuando se usa, así que un rato sin señal puede ser normal.
        </p>
      </div>
    </section>
  );
}

// Página estática: explica cómo leer los datos. Mismo lenguaje que el resto: coincidencias, nunca causas.
export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Cómo leer los datos</h1>
      <Suspense fallback={null}>
        <FamilyHelp />
      </Suspense>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué es un momento</h2>
        <p>
          Cada vez que un niño presiona su juguete se guarda un momento. Tuli mira las condiciones del salón (ruido, luz, temperatura y
          humedad) en los {PATTERNS.windowMinutes} minutos anteriores y las compara con las de cualquier otro rato del salón.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué significa «coincide»</h2>
        <p>
          Si el perfil dice que los momentos de un niño coinciden 3 veces más a menudo con ruido alto, quiere decir que ese ruido apareció
          antes de sus momentos 3 veces más seguido que en el resto del tiempo. Es una coincidencia observada: no indica la causa.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué tan fiable es</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Evidencia insuficiente: hay menos de {PATTERNS.minEvents} momentos con lecturas. No se afirma nada.</li>
          <li>Evidencia media: {PATTERNS.minEvents} momentos o más y una razón de {PATTERNS.minLift}× o más.</li>
          <li>Evidencia alta: {PATTERNS.strongEvents} momentos o más, la razón de {PATTERNS.minLift}× o más y el intervalo de confianza queda por encima de lo habitual.</li>
        </ul>
      </section>
      <section id="indicadores" className="space-y-3 scroll-mt-4">
        <h2 className="text-lg font-semibold">Indicadores de hoy</h2>
        <p>
          Cada indicador se compara con una referencia: lo habitual de tu propio salón o un rango recomendado. Sirven para ubicarte rápido,
          no para juzgar el día ni a ningún niño. Con menos de {KPI.minReadings} lecturas en el día dicen «aún sin datos suficientes».
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Momentos hoy.</strong> Se compara con el rango y la mediana de los días escolares anteriores de este salón (hasta{" "}
            {KPI.baselineDays} días). En el registro repetido de una misma persona se mira el nivel y la variación frente a su propia línea
            base, no frente a una norma externa (What Works Clearinghouse, diseños de caso único).
          </li>
          <li>
            <strong>Tiempo con ruido alto.</strong> Porcentaje de lecturas con picos de {PATTERNS.noiseHigh} dB o más. El ruido dentro del
            salón, sobre todo el que hacen los propios alumnos, se asocia con peores resultados en pruebas, y los alumnos con necesidades
            educativas especiales se ven más afectados (Shield y Dockrell, 2008). En un estudio con un indicador visual de ruido, el tiempo
            sobre 70 dBA bajó del 33 % al 24 %; es un efecto modesto y con evidencia limitada.
          </li>
          <li>
            <strong>Temperatura en rango cómodo.</strong> Porcentaje de lecturas entre {THRESHOLDS.temp.low} y {THRESHOLDS.temp.attentionHigh} °C.
            Un metaanálisis de 18 estudios (Wargocki et al., 2019) encontró que el desempeño en tareas escolares es mejor con temperaturas
            más frescas, por debajo de unos {KPI.tempRecommendedMax} °C en climas templados. Para México es una referencia provisional.
          </li>
          <li>
            <strong>Luz suficiente.</strong> Porcentaje de lecturas con {KPI.lightOk} lux o más. La norma EN 12464-1 pide unos {KPI.lightOk} lux
            para salones de primaria y 500 para tareas de lectura y escritura exigentes. La caja mide donde está colocada, no en cada mesa.
          </li>
          <li>
            <strong>Cobertura de datos.</strong> Juguetes que enviaron señal en las últimas 24 h entre los del salón. Cuando faltan datos de
            forma no aleatoria, las conclusiones se sesgan; en los registros momentáneos se suele esperar un {Math.round(KPI.coverageOk * 100)} %
            o más. Sirve para no leer «cero momentos» cuando el juguete estaba apagado.
          </li>
        </ul>
        <p className="text-sm text-muted">
          Los umbrales son provisionales y se validarán con especialistas. Algunas fuentes se revisaron solo por sus resúmenes: antes de
          citarlas, consulta el artículo original. Detalle y enlaces en <code>docs/analisis-docente.md</code>.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué NO es Tuli</h2>
        <p>
          Tuli no es un dispositivo médico y no diagnostica. Los umbrales (por ejemplo {PATTERNS.noiseHigh} dB para ruido alto) son
          provisionales y se validarán con especialistas. Úsalo como apoyo para observar y conversar con la familia.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Privacidad</h2>
        <p>
          El micrófono de la caja solo mide el nivel de ruido en decibeles: nunca graba ni envía audio. Los niños aparecen con un alias.
        </p>
      </section>
    </div>
  );
}
