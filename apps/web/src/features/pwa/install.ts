// Cómo ofrecer la instalación de la PWA en este navegador. Lógica pura (probada en install.test.ts);
// el componente InstallButton solo lee el navegador y muestra el resultado.
//
// - "installed": ya se abrió como app instalada (no se ofrece nada).
// - "prompt": el navegador dio el evento beforeinstallprompt (Android, Chrome y Edge): botón que instala.
// - "ios": iPhone o iPad en Safari: no hay botón del sistema, se muestra la guía (Compartir → Agregar a inicio).
// - "unavailable": el navegador no permite instalar (o todavía no dio el evento): no se muestra nada.
export type InstallMode = "installed" | "prompt" | "ios" | "unavailable";

export type InstallEnv = {
  userAgent: string;
  // matchMedia('(display-mode: standalone)') o navigator.standalone (Safari).
  standalone: boolean;
  // Hay un beforeinstallprompt guardado.
  hasPrompt: boolean;
  // navigator.maxTouchPoints: el iPad con iPadOS 13+ se presenta como Mac.
  maxTouchPoints: number;
};

export function isIOS(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

export function installMode(env: InstallEnv): InstallMode {
  if (env.standalone) return "installed";
  if (env.hasPrompt) return "prompt";
  if (isIOS(env.userAgent, env.maxTouchPoints)) return "ios";
  return "unavailable";
}

// Pasos de la guía para iPhone y iPad. En la app instalada la sesión no se comparte con Safari.
export const IOS_STEPS = [
  "Abre Tuli en Safari.",
  "Toca el botón Compartir (el cuadro con la flecha hacia arriba).",
  "Elige «Agregar a inicio» y luego «Agregar».",
  "Abre Tuli desde su ícono e inicia sesión una vez: la app instalada no comparte la sesión con Safari.",
] as const;
