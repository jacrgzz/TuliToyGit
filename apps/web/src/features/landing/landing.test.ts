import { describe, expect, it } from "vitest";
import { FAQ, FOR_FAMILIES, FOR_TEACHERS, LEFT_COLUMNS, PRIVACY, RIGHT_COLUMN, SECTION_IDS, STEPS, TILES } from "./content";
import { bearFade, gridOpen, heroFade, scrollProgress, smooth, tileContent, tileTint } from "./motion";

describe("motion", () => {
  it("smooth va de 0 a 1 sin salirse y es monótona", () => {
    expect(smooth(0.2, 0.6, 0)).toBe(0);
    expect(smooth(0.2, 0.6, 1)).toBe(1);
    expect(smooth(0.2, 0.6, 0.4)).toBeCloseTo(0.5);
    let prev = -1;
    for (let x = 0; x <= 1; x += 0.05) {
      const v = smooth(0.2, 0.6, x);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("arriba se ve el hero entero y al final el grid abierto con todas las tarjetas", () => {
    expect(heroFade(0)).toBe(0);
    expect(gridOpen(0)).toBe(0);
    expect(bearFade(0)).toBe(0);
    TILES.forEach((_, i) => {
      expect(tileTint(i, 0)).toBe(0);
      expect(tileContent(i, 0)).toBe(0);
      expect(tileTint(i, 1)).toBe(1);
      expect(tileContent(i, 1)).toBe(1);
    });
    expect(heroFade(1)).toBe(1);
    expect(gridOpen(1)).toBe(1);
  });

  it("las tarjetas toman color en ola (cada una después de la anterior)", () => {
    const p = 0.5;
    for (let i = 1; i < TILES.length; i++) expect(tileTint(i, p)).toBeLessThanOrEqual(tileTint(i - 1, p));
  });

  it("scrollProgress se acota a 0..1", () => {
    expect(scrollProgress(100, 2000, 800)).toBe(0);
    expect(scrollProgress(-600, 2000, 800)).toBeCloseTo(0.5);
    expect(scrollProgress(-5000, 2000, 800)).toBe(1);
    expect(scrollProgress(0, 500, 800)).toBe(0); // contenedor más bajo que el escenario
  });
});

describe("contenido", () => {
  const links = [...LEFT_COLUMNS, RIGHT_COLUMN].flatMap((c) => c.links.map((l) => l.href)).concat(TILES.map((t) => t.href));

  it("ningún enlace vacío y cada ancla existe en la página", () => {
    for (const href of links) {
      expect(href).not.toBe("#");
      if (href.startsWith("#")) expect(SECTION_IDS).toContain(href.slice(1));
      else expect(href.startsWith("/")).toBe(true);
    }
  });

  it("se puede llegar a iniciar sesión", () => {
    expect(links).toContain("/login");
  });

  const texts = [
    ...TILES.flatMap((t) => [t.title, t.text]),
    ...STEPS.flatMap((s) => [s.title, s.text]),
    ...FOR_FAMILIES,
    ...FOR_TEACHERS,
    ...PRIVACY,
  ].join(" \n ");

  it("sin lenguaje clínico", () => {
    expect(texts).not.toMatch(/diagn|ansiedad|crisis|trastorno|terapia|tratamiento|autis|tdah|s[ií]ntoma|cura/i);
  });

  it("sin prometer lo que Tuli no tiene (tienda, juegos, chat, registro abierto)", () => {
    expect(texts).not.toMatch(/comprar|tienda|juegos|chat|reg[ií]strate|registrarse/i);
  });

  it("las preguntas dejan claro que no es un dispositivo médico ni graba audio", () => {
    const faq = FAQ.map((f) => f.a).join(" ");
    expect(faq).toMatch(/no es un dispositivo médico/i);
    expect(PRIVACY.join(" ")).toMatch(/no graba audio/i);
  });
});
