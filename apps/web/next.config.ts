import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // La página de un niño son subrutas; la raíz lleva a la primera pestaña (redirección real, 307).
    return [{ source: "/dashboard/ninos/:id", destination: "/dashboard/ninos/:id/resumen", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
