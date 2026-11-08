import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mismo alias que tsconfig ("@/*" → "src/*") para que las pruebas importen igual que la app.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
