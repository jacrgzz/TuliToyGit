import { describe, expect, it } from "vitest";
import { IOS_STEPS, installMode, isIOS } from "./install";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";

const base = { userAgent: ANDROID, standalone: false, hasPrompt: false, maxTouchPoints: 5 };

describe("installMode", () => {
  it("no ofrece nada si ya está instalada, aunque haya evento", () => {
    expect(installMode({ ...base, standalone: true, hasPrompt: true })).toBe("installed");
  });

  it("usa el botón del sistema cuando el navegador dio beforeinstallprompt", () => {
    expect(installMode({ ...base, hasPrompt: true })).toBe("prompt");
  });

  it("muestra la guía en iPhone", () => {
    expect(installMode({ ...base, userAgent: IPHONE })).toBe("ios");
  });

  it("detecta el iPad que se presenta como Mac por sus puntos táctiles", () => {
    expect(isIOS(IPAD_AS_MAC, 5)).toBe(true);
    expect(isIOS(IPAD_AS_MAC, 0)).toBe(false);
  });

  it("no muestra nada si el navegador no permite instalar", () => {
    expect(installMode(base)).toBe("unavailable");
  });
});

describe("IOS_STEPS", () => {
  it("avisa que hay que iniciar sesión dentro de la app", () => {
    expect(IOS_STEPS.at(-1)).toMatch(/inicia sesión/);
  });
});
