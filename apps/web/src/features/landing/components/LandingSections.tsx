import Link from "next/link";
import { FAQ, FOR_FAMILIES, FOR_TEACHERS, PRIVACY, STEPS } from "../content";

// Contenido de la landing debajo del grid. Es HTML del servidor: se lee aunque el 3D no cargue,
// sin JavaScript y con lector de pantalla. Cada id es destino de una tarjeta o del menú.

const INK = "#2e1650";

function Section({ id, title, bg, children }: { id: string; title: string; bg: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-[28px] p-6 sm:p-10" style={{ background: bg, color: INK }}>
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      <div className="mt-4 text-base leading-relaxed sm:text-lg">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-[#6341c4]" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LandingSections() {
  return (
    <div className="mx-auto mt-6 flex max-w-[1400px] flex-col gap-4 sm:mt-10 sm:gap-6">
      <Section id="que-es" title="Conoce a Tuli" bg="#fbf8ff">
        <p className="max-w-[60ch]">
          Tuli es un juguete que el niño aprieta cuando lo necesita y una caja de sensores que mide el ambiente del
          salón. El panel muestra qué condiciones coinciden con esos momentos, para que la familia y la escuela
          platiquen mejor informadas.
        </p>
        <p className="mt-3 max-w-[60ch] font-semibold">Muestra coincidencias, no causas. No es un dispositivo médico.</p>
      </Section>

      <Section id="como-funciona" title="Cómo funciona" bg="#ffe7d2">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-white/70 p-5">
              <span className="text-sm font-semibold text-[#6341c4]">Paso {i + 1}</span>
              <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-base">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Section id="familias" title="Para familias" bg="#ffd9ec">
          <Bullets items={FOR_FAMILIES} />
        </Section>
        <Section id="docentes" title="Para docentes" bg="#e4d7fb">
          <Bullets items={FOR_TEACHERS} />
        </Section>
      </div>

      <Section id="privacidad" title="Privacidad" bg="#fbf8ff">
        <Bullets items={PRIVACY} />
      </Section>

      <Section id="preguntas" title="Preguntas" bg="#ffe7d2">
        <dl className="flex flex-col gap-5">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-bold">{f.q}</dt>
              <dd className="mt-1 max-w-[70ch]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <section className="flex flex-col items-start gap-4 rounded-[28px] bg-[#6341c4] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">¿Tu escuela ya usa Tuli?</h2>
        <Link
          href="/login"
          className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-[#2e1650] transition-transform hover:scale-105"
        >
          Iniciar sesión
        </Link>
      </section>
    </div>
  );
}
