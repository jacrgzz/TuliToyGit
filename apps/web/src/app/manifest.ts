import type { MetadataRoute } from "next";

// PWA instalable (sin service worker por ahora: no se guarda nada offline porque los
// datos de los niños son sensibles). Funciona en Android/Chrome y en iOS con
// "Agregar a pantalla de inicio".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tuli",
    short_name: "Tuli",
    description:
      "Condiciones del ambiente que coinciden con los momentos de uso del juguete. No es un dispositivo médico.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf7",
    theme_color: "#db4a2b",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
