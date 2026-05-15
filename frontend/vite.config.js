import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      // /docs is intentionally NOT proxied. Astro's dev server emits
      // asset URLs that live outside /docs (virtual imports, /node_modules,
      // /_astro), and proxying just /docs makes Vite try to transform
      // Astro internals itself. Cross-origin link to :4321 in dev is the
      // right answer — see frontend/src/lib/docs-link.js.
    },
  },
});
