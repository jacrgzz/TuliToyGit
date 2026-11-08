import Link from "next/link";

const steps = [
  {
    title: "Juguete",
    text: "El niño lo presiona cuando lo necesita. Solo se guarda la hora de cada pulsación.",
  },
  {
    title: "Caja del salón",
    text: "Mide ruido, luz, temperatura y humedad del espacio. No graba audio ni usa cámaras.",
  },
  {
    title: "Panel",
    text: "Cruza ambos datos y muestra qué condiciones se repiten antes de cada momento.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <span className="text-xl font-bold text-brand">Tuli</span>
        <Link
          href="/login"
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Entiende qué condiciones del ambiente coinciden con los momentos de
          tu niño.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Tuli es un juguete y una caja de sensores que ayudan a madres, padres,
          tutores y docentes a ver patrones entre el ambiente y los momentos en
          que un niño usa su juguete.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Entrar
        </Link>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">Cómo funciona</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-xl border border-border bg-white p-4"
              >
                <span className="text-sm font-semibold text-brand">
                  Paso {i + 1}
                </span>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted">
        Tuli no es un dispositivo médico ni ofrece diagnósticos: solo muestra
        coincidencias entre el ambiente y los momentos registrados.
      </footer>
    </div>
  );
}
