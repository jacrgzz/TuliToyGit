import type { ViewerRole } from "@/features/auth/queries";
import { BATTERY, KPI } from "@/lib/thresholds";
import { childTabsFor, type NavItem } from "./nav-items";

// Barra superior del dashboard: búsqueda (⌘K) y campana de avisos. Lógica pura y probada; las
// consultas viven en TopBar.tsx y la interfaz en TopBarClient.tsx. Ver docs/estilo-dashboard.md (sección 6).

// ---------------------------------------------------------------- búsqueda

export type SearchItem = {
  href: string;
  label: string;
  hint: string; // "Sección", "Niño", "Alumno A · pestaña"…
  kind: "section" | "child" | "child-tab";
  newTab?: boolean;
};

type Kid = { id: string; display_name: string };

// Sin acentos, en minúsculas y sin espacios de sobra: "Bitácora" y "bitacora" coinciden.
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Secciones del rol + cada niño visible (y sus pestañas, para "momentos de Alumno A").
export function searchIndex(nav: NavItem[], kids: Kid[], role: ViewerRole): SearchItem[] {
  const sections: SearchItem[] = nav.map((n) => ({ href: n.href, label: n.label, hint: "Sección", kind: "section", newTab: n.newTab }));
  const tabs = childTabsFor(role);
  const children: SearchItem[] = kids.flatMap((k) => [
    { href: `/dashboard/ninos/${k.id}/resumen`, label: k.display_name, hint: role === "guardian" ? "Tu niño" : "Niño", kind: "child" as const },
    ...tabs
      .filter((t) => t.slug !== "resumen")
      .map((t) => ({ href: `/dashboard/ninos/${k.id}/${t.slug}`, label: `${t.label} de ${k.display_name}`, hint: k.display_name, kind: "child-tab" as const })),
  ]);
  return [...sections, ...children];
}

const KIND_ORDER: Record<SearchItem["kind"], number> = { section: 0, child: 1, "child-tab": 2 };

// Una palabra de la búsqueda coincide si aparece en el texto; si es una sola letra ("Alumno A"),
// tiene que ser una palabra completa, para que "alumno a" no traiga también a "Alumno B".
function wordMatches(word: string, text: string, tokens: string[]): boolean {
  return word.length === 1 ? tokens.includes(word) : text.includes(word);
}

// Sin texto: solo las secciones. Con texto: todas las palabras deben aparecer (en cualquier orden);
// primero lo que empieza igual, luego secciones, niños y pestañas.
export function filterSearch(items: SearchItem[], query: string, limit = 8): SearchItem[] {
  const q = normalize(query);
  if (!q) return items.filter((i) => i.kind === "section").slice(0, limit);
  const words = q.split(" ");
  return items
    .map((item) => {
      const text = normalize(`${item.label} ${item.hint}`);
      return { item, text, tokens: text.split(" "), label: normalize(item.label) };
    })
    .filter(({ text, tokens }) => words.every((w) => wordMatches(w, text, tokens)))
    .sort((a, b) => Number(b.label.startsWith(q)) - Number(a.label.startsWith(q)) || KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind])
    .slice(0, limit)
    .map(({ item }) => item);
}

// ---------------------------------------------------------------- avisos

export type Notice = {
  id: string;
  tone: "high" | "attention" | "idle";
  title: string;
  detail: string;
  href: string;
};

type Toy = { last_seen_at: string | null; battery_pct: number | null; age_ms: number | null };

// Avisos que ya existen en la app, juntos en la campana: ruido alto ahora (solo docente), batería baja
// y juguetes que no han enviado datos en 24 h (la misma ventana que la cobertura de datos).
// Lenguaje neutral: describe el ambiente o el dispositivo, nunca qué le pasa a un niño.
export function buildNotices({
  liveMessage,
  kids,
  toys,
  role,
}: {
  liveMessage: string | null;
  kids: Kid[];
  toys: Map<string, Toy>;
  role: ViewerRole;
}): Notice[] {
  const notices: Notice[] = [];
  if (liveMessage) {
    notices.push({ id: "ruido-ahora", tone: "high", title: "Ruido alto en el salón ahora", detail: liveMessage, href: "/dashboard" });
  }
  const deviceHref = (kid: Kid) => (role === "guardian" ? `/dashboard/ninos/${kid.id}/resumen` : "/dashboard/dispositivos");
  const low: Notice[] = [];
  const quiet: Notice[] = [];
  for (const kid of kids) {
    const toy = toys.get(kid.id);
    if (!toy) continue; // sin juguete asignado: no hay nada que avisar
    if (toy.battery_pct !== null && toy.battery_pct < BATTERY.low) {
      low.push({
        id: `bateria-${kid.id}`,
        tone: "attention",
        title: `Batería baja en el Tuli de ${kid.display_name}`,
        detail: `${Math.round(toy.battery_pct)} %. Conviene cargarlo.`,
        href: deviceHref(kid),
      });
    }
    if (toy.age_ms === null || toy.age_ms > KPI.coverageWindowMs) {
      quiet.push({
        id: `datos-${kid.id}`,
        tone: "idle",
        title: `El Tuli de ${kid.display_name} no ha enviado datos en 24 h`,
        detail: toy.last_seen_at ? "Revisa que esté encendido y con batería." : "Todavía no ha enviado ningún dato.",
        href: deviceHref(kid),
      });
    }
  }
  return [...notices, ...low, ...quiet];
}
