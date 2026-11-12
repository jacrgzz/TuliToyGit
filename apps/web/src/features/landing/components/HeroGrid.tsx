"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import OsitoCanvas from "./scene/OsitoCanvas";
import { ositoView, hasWebGL } from "./scene/view";
import { ToyBoxBadge } from "./ToyBoxBadge";
import { LEFT_COLUMNS, RIGHT_COLUMN, TILES, type NavColumn } from "../content";
import {
  LOADING_TIMEOUT_MS,
  bearFade,
  bearReveal,
  gridOpen,
  heroFade,
  scrollProgress,
  tileContent,
  tileTint,
} from "../motion";

/**
 * Hero que se vuelve grid con el scroll (diseño de Angel Cervantes). El fondo morado del hero ya ES
 * el grid: tarjetas pegadas sin espacio que comparten el mismo degradado (fijo a la ventana), así que
 * se leen como una sola tarjeta. Al bajar se abren los espacios, se redondean las esquinas y cada
 * tarjeta toma su color en ola; el osito, el título y el menú se desvanecen. Todo va en un escenario
 * sticky dentro de un contenedor alto: el avance del scroll en ese contenedor es la animación.
 *
 * Mientras carga el osito se ve una pantalla blanca con el nombre; cuando está listo (o pasan 6 s, o no
 * hay WebGL) el escenario morado se abre desde el centro.
 */

const HERO_BG = "radial-gradient(ellipse 60% 55% at 50% 45%, #d9c6f7 0%, #c2a5f1 45%, #ad8beb 100%)";
const NAV_INK = "#2e1650"; // texto del menú sobre el morado claro: contraste AA

type Phase = "loading" | "opening" | "open";
const OPEN_MS = 900;

function NavCol({ title, links }: NavColumn) {
  return (
    <nav aria-label={title} className="flex flex-col gap-2.5" style={{ color: NAV_INK }}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="text-[14px] opacity-85 transition-opacity hover:opacity-100 hover:underline">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function HeroGrid() {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const bear = useRef<HTMLDivElement>(null);
  const under = useRef<HTMLDivElement>(null);
  const tints = useRef<(HTMLDivElement | null)[]>([]);
  const contents = useRef<(HTMLDivElement | null)[]>([]);
  const [heroGone, setHeroGone] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [noBear, setNoBear] = useState(false);

  // pantalla de carga: se abre al primer cuadro del osito, a los 6 s, o enseguida si no hay WebGL
  const openRef = useRef<() => void>(() => {});
  useEffect(() => {
    let done = false;
    let t2: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      if (done) return;
      done = true;
      setPhase("opening");
      t2 = setTimeout(() => setPhase("open"), OPEN_MS);
    };
    openRef.current = open;
    const webgl = hasWebGL();
    const t1 = setTimeout(() => {
      if (!webgl) setNoBear(true);
      open();
    }, webgl ? LOADING_TIMEOUT_MS : 0);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let p = 0; // avance suavizado
    let gone = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      raf = 0;
      const w = wrap.current;
      const st = stage.current;
      if (!w || !st) return;
      const target = scrollProgress(w.getBoundingClientRect().top, w.offsetHeight, st.offsetHeight);
      // con movimiento reducido no hay arrastre: sigue al scroll tal cual
      p = reduce ? target : p + (target - p) * 0.18;
      if (Math.abs(target - p) < 0.0005) p = target;

      // el grid se abre: espacio, margen y esquinas
      const e = gridOpen(p);
      st.style.setProperty("--gap", `${(e * 14).toFixed(2)}px`);
      st.style.setProperty("--pad", `${(e * 14).toFixed(2)}px`);
      st.style.setProperty("--r", `${(e * 22).toFixed(2)}px`);
      if (under.current) under.current.style.opacity = String(1 - e);

      // el hero se va: sube un poco, se encoge y se desvanece
      const f = heroFade(p);
      if (hero.current) {
        hero.current.style.opacity = String(1 - f);
        hero.current.style.transform = reduce
          ? ""
          : `translateY(${(-f * 40).toFixed(1)}px) scale(${(1 - f * 0.06).toFixed(4)})`;
        hero.current.inert = f > 0.5;
      }
      // el osito no se mueve con el hero (dejaría ver el corte de abajo): la cámara se aleja hasta
      // mostrarlo completo y después se desvanece
      ositoView.reveal = bearReveal(p);
      const b = bearFade(p);
      if (bear.current) {
        bear.current.style.opacity = String(1 - b);
        bear.current.style.pointerEvents = b > 0.5 ? "none" : "";
      }
      const isGone = b > 0.98;
      if (isGone !== gone) {
        gone = isGone;
        setHeroGone(isGone);
      }

      // cada tarjeta toma su color y luego su contenido, en ola
      TILES.forEach((_, i) => {
        const tint = tints.current[i];
        const c = contents.current[i];
        if (tint) tint.style.opacity = String(tileTint(i, p));
        if (c) {
          const k = tileContent(i, p);
          c.style.opacity = String(k);
          c.style.transform = reduce ? "" : `translateY(${((1 - k) * 14).toFixed(1)}px)`;
          c.inert = k < 0.5; // invisible = fuera del orden de tabulación
        }
      });

      if (p !== target) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const loading = phase === "loading";

  return (
    <>
      {/* pantalla de carga: blanca con el nombre; el escenario morado se abre encima desde el centro */}
      {phase !== "open" && (
        <div
          aria-hidden
          className="landing-curtain fixed inset-0 z-0 grid place-items-center bg-white transition-opacity duration-700"
          style={{ opacity: loading ? 1 : 0 }}
        >
          <span className="animate-pulse text-7xl font-extrabold tracking-tight text-[#6341c4] motion-reduce:animate-none sm:text-8xl">
            Tuli
          </span>
        </div>
      )}
      {loading && (
        <p role="status" className="sr-only">
          Cargando Tuli…
        </p>
      )}

      {/* alto = 1 pantalla de hero + ~1.4 de recorrido para la transformación */}
      <div ref={wrap} id="inicio" className="relative mx-auto h-[240vh] max-w-[1400px]">
        <div
          ref={stage}
          className="landing-stage sticky top-3 z-10 h-[calc(100dvh-1.5rem)] overflow-clip rounded-[28px] shadow-[0_20px_60px_-20px_rgba(90,50,160,0.45)] transition-[clip-path] ease-[cubic-bezier(.7,0,.2,1)] motion-reduce:transition-none sm:top-6 sm:h-[calc(100dvh-3rem)] lg:top-8 lg:h-[calc(100dvh-4rem)]"
          style={{
            ["--gap" as string]: "0px",
            ["--pad" as string]: "0px",
            ["--r" as string]: "0px",
            clipPath: loading ? "inset(50% 50% 50% 50% round 28px)" : "inset(0% 0% 0% 0% round 28px)",
            transitionDuration: `${OPEN_MS}ms`,
          }}
        >
          {/* capa de abajo con el mismo degradado: tapa las juntas mientras las tarjetas están pegadas */}
          <div ref={under} className="absolute inset-0" style={{ background: HERO_BG, backgroundAttachment: "fixed" }} />

          {/* el grid */}
          <div
            className="absolute inset-0 grid grid-cols-2 grid-rows-4 md:grid-cols-4 md:grid-rows-3"
            style={{ gap: "var(--gap)", padding: "var(--pad)" }}
          >
            {TILES.map((t, i) => (
              <div
                key={t.title}
                className={`relative overflow-hidden ${t.span}`}
                style={{ borderRadius: "var(--r)", background: HERO_BG, backgroundAttachment: "fixed" }}
              >
                <div
                  ref={(el) => void (tints.current[i] = el)}
                  className="absolute inset-0"
                  style={{ background: t.bg, opacity: 0 }}
                />
                <div
                  ref={(el) => void (contents.current[i] = el)}
                  className="landing-tile relative flex h-full flex-col justify-between p-4 sm:p-7"
                  style={{ color: t.ink, opacity: 0 }}
                >
                  <p
                    className={`pr-9 font-extrabold tracking-tight md:pr-0 ${i === 0 ? "text-3xl sm:text-5xl" : "text-lg sm:text-2xl"}`}
                  >
                    {t.title}
                  </p>
                  <div className="flex items-end justify-between gap-4">
                    <p
                      className={`max-w-[28ch] opacity-90 ${i === 0 ? "text-base sm:text-lg" : "text-[13px] leading-snug sm:text-sm"}`}
                    >
                      {t.text}
                    </p>
                    <a
                      href={t.href}
                      aria-label={t.title}
                      // en móvil la flecha va arriba a la derecha para dejarle el ancho al texto
                      className="absolute right-3 top-3 grid size-8 shrink-0 place-items-center rounded-full transition-transform hover:scale-110 md:static md:size-10"
                      style={{ background: t.ink, color: t.bg }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* osito: fuera del hero para que no se desplace con él */}
          {!noBear && (
            <div ref={bear} className="absolute inset-0" aria-hidden>
              <OsitoCanvas
                paused={heroGone}
                onReady={() => openRef.current()}
                onFail={() => {
                  setNoBear(true);
                  openRef.current();
                }}
              />
            </div>
          )}

          {/* hero encima: menú, título y botones; entran después de que se abre el escenario */}
          <div ref={hero} className="pointer-events-none absolute inset-0 origin-center will-change-transform">
            <div
              className="landing-intro absolute inset-0 transition-[opacity,translate] delay-300 duration-700 motion-reduce:transition-none"
              style={{ opacity: loading ? 0 : 1, translate: loading ? "0 12px" : "0 0" }}
            >
              <header className="pointer-events-none relative z-10 flex items-start justify-between gap-6 p-6 sm:p-10">
                <div className="pointer-events-auto hidden gap-10 md:flex">
                  {LEFT_COLUMNS.map((c) => (
                    <NavCol key={c.title} {...c} />
                  ))}
                </div>
                <h1 className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_14px_rgba(80,40,150,0.35)] sm:top-14 sm:text-6xl lg:text-7xl">
                  Tuli
                </h1>
                <div className="pointer-events-auto hidden md:block">
                  <NavCol {...RIGHT_COLUMN} />
                </div>
              </header>
              <p className="sr-only">
                Ilustración de Tuli: un osito de peluche que saluda. Puedes hacerle clic o jalarle las patitas.
              </p>
              <a
                href="#que-es"
                aria-label="Qué es Tuli"
                className="pointer-events-auto absolute bottom-5 left-5 z-10 grid size-16 place-items-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-105 sm:bottom-8 sm:left-8 sm:size-20"
              >
                <ToyBoxBadge />
              </a>
              <Link
                href="/login"
                className="pointer-events-auto absolute bottom-5 right-5 z-10 flex h-16 items-center gap-2 rounded-full bg-white/90 px-6 text-base font-semibold text-[#2e1650] shadow-lg transition-transform hover:scale-105 sm:bottom-8 sm:right-8 sm:h-20 sm:px-8 sm:text-lg"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 sm:size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
