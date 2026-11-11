import type { ViewerRole } from "@/features/auth/queries";

// Secciones de la barra lateral por rol. Es una lista de datos pura (sin React) para poder
// probarla: el cliente traduce `icon` a un ícono de lucide-react.
export type NavIcon =
  | "house"
  | "school"
  | "users"
  | "zap"
  | "clipboard"
  | "file"
  | "cpu"
  | "monitor"
  | "help";

export type NavItem = {
  href: string;
  label: string;
  // Texto corto para la barra inferior del teléfono (si no hay, se usa `label`).
  short?: string;
  icon: NavIcon;
  // Otras rutas que también marcan esta sección como activa (p. ej. el detalle de un momento).
  alsoActiveFor?: string[];
  // Se abre en otra pestaña y fuera del panel (p. ej. la pantalla del salón, para proyectar).
  newTab?: boolean;
};

const HOY: NavItem = { href: "/dashboard", label: "Hoy", icon: "house" };
const NINOS: NavItem = { href: "/dashboard/ninos", label: "Niños", icon: "users" };
const AYUDA: NavItem = { href: "/dashboard/ayuda", label: "Cómo leer los datos", short: "Ayuda", icon: "help" };

export function navItemsFor(role: ViewerRole): NavItem[] {
  switch (role) {
    case "teacher":
      return [
        HOY,
        { href: "/dashboard/salon", label: "Mi salón", short: "Salón", icon: "school" },
        NINOS,
        { href: "/dashboard/momentos", label: "Momentos", icon: "zap", alsoActiveFor: ["/dashboard/eventos"] },
        { href: "/dashboard/bitacora", label: "Bitácora", icon: "clipboard" },
        { href: "/dashboard/reportes", label: "Reportes", icon: "file" },
        { href: "/dashboard/dispositivos", label: "Dispositivos", icon: "cpu" },
        { href: "/pantalla", label: "Pantalla del salón", short: "Pantalla", icon: "monitor", newTab: true },
        AYUDA,
      ];
    case "admin":
      return [
        { ...HOY, label: "Resumen" },
        NINOS,
        { href: "/dashboard/dispositivos", label: "Dispositivos", icon: "cpu" },
        { href: "/dashboard/reportes", label: "Reportes", icon: "file" },
        AYUDA,
      ];
    default:
      return [
        { ...HOY, label: "Inicio" },
        { ...NINOS, label: "Mis niños", short: "Niños", alsoActiveFor: ["/dashboard/eventos"] },
        { href: "/dashboard/reportes", label: "Reportes", icon: "file" },
        AYUDA,
      ];
  }
}

// "Hoy" (/dashboard) solo está activo en su ruta exacta; las demás, también en sus subrutas.
export function isActive(pathname: string, item: NavItem): boolean {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  const path = norm(pathname);
  if (item.href === "/dashboard") return path === "/dashboard";
  return [item.href, ...(item.alsoActiveFor ?? [])].some((h) => path === h || path.startsWith(`${h}/`));
}

// Pestañas de la página de cada niño (subrutas de /dashboard/ninos/[id]).
export const CHILD_TABS = [
  { slug: "resumen", label: "Resumen" },
  { slug: "perfil", label: "Perfil" },
  { slug: "horarios", label: "Horarios" },
  { slug: "momentos", label: "Momentos" },
  { slug: "ajustes", label: "Ajustes" },
  { slug: "reporte", label: "Reporte" },
] as const;
export type ChildTab = (typeof CHILD_TABS)[number]["slug"] | "semana";

// La familia ve una versión más sencilla: "Hoy" (la ruta resumen), "Su semana", sus momentos y el
// reporte. El análisis técnico (perfil y horarios) sigue disponible desde "Su semana".
// Ver docs/vista-tutor.md.
export const FAMILY_TABS: { slug: ChildTab; label: string }[] = [
  { slug: "resumen", label: "Hoy" },
  { slug: "semana", label: "Su semana" },
  { slug: "momentos", label: "Momentos" },
  { slug: "reporte", label: "Reporte" },
];

export function childTabsFor(role: ViewerRole): { slug: ChildTab; label: string }[] {
  return role === "guardian" ? FAMILY_TABS : [...CHILD_TABS];
}
