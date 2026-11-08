import { PATTERNS } from "@/lib/thresholds";
import { summarize } from "../evidence";
import type { ConditionLiftRow } from "../queries";

// A9: el perfil en lenguaje simple, con los límites dichos con claridad.
export function ProfileSummary({ rows, days }: { rows: ConditionLiftRow[]; days: number }) {
  const sentences = summarize(rows);
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <ul className="list-disc space-y-2 pl-5">
        {sentences.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Últimos {days} días. Son coincidencias entre el ambiente del salón y los momentos en que
        usó el juguete; no indican la causa. Tuli no es un dispositivo médico ni ofrece diagnósticos.
      </p>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-foreground">¿Cómo se calcula?</summary>
        <div className="mt-2 space-y-2">
          <p>
            Para cada condición se compara qué tan seguido apareció en los {PATTERNS.windowMinutes}{" "}
            minutos previos a sus momentos contra qué tan seguido aparece en cualquier ventana de{" "}
            {PATTERNS.windowMinutes} minutos en el salón. Si es 2× más frecuente antes de sus momentos,
            la razón es 2×.
          </p>
          <p>
            <strong>Evidencia alta:</strong> al menos {PATTERNS.strongEvents} momentos, razón de{" "}
            {PATTERNS.minLift}× o más y el margen probable (intervalo de Wilson al 95 %) queda por encima
            del resto del tiempo. <strong>Media:</strong> al menos {PATTERNS.minEvents} momentos y razón
            de {PATTERNS.minLift}× o más. Con menos de {PATTERNS.minEvents} momentos no se muestra
            ninguna conclusión.
          </p>
          <p>
            Es una evaluación descriptiva: muestra qué condiciones acompañan a los momentos, no por qué
            ocurren. Los umbrales son provisionales hasta validarlos con especialistas.
          </p>
        </div>
      </details>
    </div>
  );
}
