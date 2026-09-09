import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        reference: fileURLToPath(new URL("./reference.html", import.meta.url)),
        studio: fileURLToPath(new URL("./index.html", import.meta.url)),
        personality: fileURLToPath(
          new URL("./personality.html", import.meta.url),
        ),
        character: fileURLToPath(new URL("./character.html", import.meta.url)),
        design: fileURLToPath(new URL("./design.html", import.meta.url)),
      },
    },
  },
});
