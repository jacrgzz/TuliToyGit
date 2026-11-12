import { Poppins } from "next/font/google";
import HeroGrid from "@/features/landing/components/HeroGrid";
import LandingSections from "@/features/landing/components/LandingSections";

// Landing: diseño de Angel Cervantes (osito 3D y hero que se vuelve grid). Plan en docs/landing.md.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "800"], display: "swap" });

// Sin JavaScript no hay pantalla de carga ni animación: todo visible desde el principio.
const NO_JS_CSS =
  ".landing-curtain{display:none!important}.landing-stage{clip-path:none!important}.landing-intro,.landing-tile{opacity:1!important;translate:none!important}";

export default function Home() {
  return (
    <main className={`${poppins.className} min-h-[100dvh] w-full flex-1 bg-[#efe9fb] px-3 sm:px-6 lg:px-8`}>
      <noscript>
        <style>{NO_JS_CSS}</style>
      </noscript>
      <HeroGrid />
      <LandingSections />
      <footer className="mx-auto max-w-[1400px] px-2 py-8 text-center text-sm text-[#4a3a63]">
        Tuli no es un dispositivo médico ni ofrece diagnósticos: solo muestra coincidencias entre el ambiente y los
        momentos registrados.
      </footer>
    </main>
  );
}
