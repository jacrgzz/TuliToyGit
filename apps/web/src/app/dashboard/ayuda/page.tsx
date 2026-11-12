import { PATTERNS } from "@/lib/thresholds";

// Página estática: explica cómo leer los datos. Mismo lenguaje que el resto: coincidencias, nunca causas.
export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Cómo leer los datos</h1>
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
