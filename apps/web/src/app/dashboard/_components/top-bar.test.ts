import { describe, expect, it } from "vitest";
import { navItemsFor } from "./nav-items";
import { buildNotices, filterSearch, normalize, searchIndex } from "./top-bar";

const kids = [
  { id: "a", display_name: "Alumno A" },
  { id: "b", display_name: "Ana Bárbara" },
];

describe("búsqueda", () => {
  it("normaliza acentos, mayúsculas y espacios", () => {
    expect(normalize("  Bitácora   DEL Salón ")).toBe("bitacora del salon");
  });

  it("sin texto muestra solo las secciones del rol", () => {
    const idx = searchIndex(navItemsFor("teacher"), kids, "teacher");
    const res = filterSearch(idx, "");
    expect(res.every((r) => r.kind === "section")).toBe(true);
    expect(res.map((r) => r.label)).toContain("Hoy");
  });

  it("encuentra secciones sin acentos y niños por nombre", () => {
    const idx = searchIndex(navItemsFor("teacher"), kids, "teacher");
    expect(filterSearch(idx, "bitacora")[0].href).toBe("/dashboard/bitacora");
    expect(filterSearch(idx, "barbara")[0]).toMatchObject({ kind: "child", href: "/dashboard/ninos/b/resumen" });
  });

  it("busca pestañas de un niño con varias palabras en cualquier orden", () => {
    const idx = searchIndex(navItemsFor("teacher"), kids, "teacher");
    const res = filterSearch(idx, "alumno a momentos");
    expect(res[0].href).toBe("/dashboard/ninos/a/momentos");
  });

  it("una letra sola es una palabra completa: «alumno a» no trae a «Alumno B»", () => {
    const two = [
      { id: "a", display_name: "Alumno A" },
      { id: "b", display_name: "Alumno B" },
    ];
    const idx = searchIndex(navItemsFor("teacher"), two, "teacher");
    const res = filterSearch(idx, "alumno a mom");
    expect(res.map((r) => r.href)).toEqual(["/dashboard/ninos/a/momentos"]);
  });

  it("la familia solo ve sus secciones y sus pestañas", () => {
    const idx = searchIndex(navItemsFor("guardian"), kids.slice(0, 1), "guardian");
    expect(idx.some((i) => i.href === "/dashboard/bitacora")).toBe(false);
    expect(idx.some((i) => i.href === "/dashboard/ninos/a/perfil")).toBe(false);
    expect(idx.some((i) => i.href === "/dashboard/ninos/a/semana")).toBe(true);
  });

  it("respeta el límite y no devuelve nada si no coincide", () => {
    const idx = searchIndex(navItemsFor("teacher"), kids, "teacher");
    expect(filterSearch(idx, "a", 3)).toHaveLength(3);
    expect(filterSearch(idx, "zzz")).toEqual([]);
  });
});

describe("avisos", () => {
  const day = 24 * 60 * 60 * 1000;

  it("ordena ruido ahora, batería baja y juguetes sin datos", () => {
    const toys = new Map([
      ["a", { last_seen_at: "2026-11-01T10:00:00Z", battery_pct: 12, age_ms: 2 * day }],
      ["b", { last_seen_at: "2026-11-12T10:00:00Z", battery_pct: 80, age_ms: 1000 }],
    ]);
    const n = buildNotices({ liveMessage: "Ruido alto.", kids, toys, role: "teacher" });
    expect(n.map((x) => x.tone)).toEqual(["high", "attention", "idle"]);
    expect(n[1].title).toContain("Alumno A");
    expect(n[1].href).toBe("/dashboard/dispositivos");
  });

  it("no avisa sin juguete y avisa si nunca envió datos", () => {
    const toys = new Map([["b", { last_seen_at: null, battery_pct: null, age_ms: null }]]);
    const n = buildNotices({ liveMessage: null, kids, toys, role: "guardian" });
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ tone: "idle", href: "/dashboard/ninos/b/resumen" });
    expect(n[0].detail).toContain("Todavía no");
  });

  it("no usa lenguaje clínico", () => {
    const toys = new Map([["a", { last_seen_at: null, battery_pct: 5, age_ms: null }]]);
    const text = buildNotices({ liveMessage: null, kids, toys, role: "teacher" })
      .map((x) => `${x.title} ${x.detail}`)
      .join(" ")
      .toLowerCase();
    for (const w of ["diagn", "ansiedad", "crisis", "trastorno", "síntoma"]) expect(text).not.toContain(w);
  });
});
