import { describe, expect, it } from "vitest";
import { CHILD_TABS, isActive, navItemsFor } from "./nav-items";

describe("navItemsFor", () => {
  it("el docente ve las 9 secciones", () => {
    expect(navItemsFor("teacher").map((i) => i.href)).toEqual([
      "/dashboard",
      "/dashboard/salon",
      "/dashboard/ninos",
      "/dashboard/momentos",
      "/dashboard/bitacora",
      "/dashboard/reportes",
      "/dashboard/dispositivos",
      "/pantalla",
      "/dashboard/ayuda",
    ]);
  });

  it("la pantalla del salón es solo del docente y se abre en otra pestaña", () => {
    const screen = navItemsFor("teacher").find((i) => i.href === "/pantalla");
    expect(screen?.newTab).toBe(true);
    for (const role of ["guardian", "admin"] as const) {
      expect(navItemsFor(role).some((i) => i.href === "/pantalla")).toBe(false);
    }
  });

  it("el tutor NO ve secciones del docente (salón, bitácora, momentos del salón, dispositivos)", () => {
    const hrefs = navItemsFor("guardian").map((i) => i.href);
    for (const h of ["/dashboard/salon", "/dashboard/bitacora", "/dashboard/momentos", "/dashboard/dispositivos"]) {
      expect(hrefs).not.toContain(h);
    }
  });

  it("ninguna ruta se repite y todas cuelgan de /dashboard (salvo la pantalla del salón)", () => {
    for (const role of ["teacher", "guardian", "admin"] as const) {
      const hrefs = navItemsFor(role).map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
      expect(hrefs.every((h) => h.startsWith("/dashboard") || h === "/pantalla")).toBe(true);
    }
  });

  it("las etiquetas no usan lenguaje clínico", () => {
    const labels = (["teacher", "guardian", "admin"] as const).flatMap((r) => navItemsFor(r).map((i) => i.label)).join(" ");
    expect(labels).not.toMatch(/diagn|ansiedad|terapia|tratamiento/i);
  });
});

describe("isActive", () => {
  const [hoy, salon, ninos, momentos] = navItemsFor("teacher");
  it("Hoy solo en su ruta exacta", () => {
    expect(isActive("/dashboard", hoy)).toBe(true);
    expect(isActive("/dashboard/salon", hoy)).toBe(false);
  });
  it("las demás secciones también en sus subrutas", () => {
    expect(isActive("/dashboard/salon", salon)).toBe(true);
    expect(isActive("/dashboard/ninos/abc/perfil", ninos)).toBe(true);
    expect(isActive("/dashboard/ninos", ninos)).toBe(true);
    expect(isActive("/dashboard/ninosx", ninos)).toBe(false);
  });
  it("el detalle de un momento marca Momentos", () => {
    expect(isActive("/dashboard/eventos/12", momentos)).toBe(true);
  });
  it("ignora la barra final", () => {
    expect(isActive("/dashboard/salon/", salon)).toBe(true);
  });
});

describe("CHILD_TABS", () => {
  it("tiene las 6 pestañas, con resumen primero", () => {
    expect(CHILD_TABS.map((t) => t.slug)).toEqual(["resumen", "perfil", "horarios", "momentos", "ajustes", "reporte"]);
  });
});
