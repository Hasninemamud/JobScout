import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// In development the Node backend runs on :3000 and Vite proxies /api to it.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3000" },
  },
  // Never inline assets as data: URIs; the server's Content Security Policy only allows fonts from 'self'.
  build: { outDir: "dist", sourcemap: false, assetsInlineLimit: 0 },
});
