import type { MetadataRoute } from "next";

// PWA instalable (sin service worker por ahora: no se guarda nada offline porque los
// datos de los niños son sensibles; plan en docs/plan-pwa.md). Funciona en Android/Chrome
// y en iOS con "Agregar a pantalla de inicio". El botón "Instalar Tuli" está en
// features/pwa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Tuli",
    short_name: "Tuli",
    description:
      "Condiciones del ambiente que coinciden con los momentos de uso del juguete. No es un dispositivo médico.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#efe9fb",
    theme_color: "#6341c4",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atajos al mantener presionado el ícono (Android y escritorio; iPhone no los muestra).
    // Bitácora y Pantalla del salón son del docente: a otro rol le responden 404.
    shortcuts: [
      { name: "Hoy", url: "/dashboard", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      {
        name: "Bitácora",
        description: "Para docentes: anotar actividades del día",
        url: "/dashboard/bitacora",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Pantalla del salón",
        description: "Para docentes: semáforo de ruido para proyectar",
        url: "/pantalla",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
