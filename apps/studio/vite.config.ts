import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { input: { main: fileURLToPath(new URL("./index.html", import.meta.url)), spatial: fileURLToPath(new URL("./spatial.html", import.meta.url)) } } },
  server: { port: 14517 },
  preview: { port: 14517 },
});
