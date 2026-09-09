import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        studio: fileURLToPath(new URL("./index.html", import.meta.url)),
        personality: fileURLToPath(new URL("./personality.html", import.meta.url)),
        character: fileURLToPath(new URL("./character.html", import.meta.url)),
        design: fileURLToPath(new URL("./design.html", import.meta.url)),
      },
    },
  },
});
