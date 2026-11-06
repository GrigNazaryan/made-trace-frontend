import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// No proxy needed: the API base URL is read from VITE_API_BASE_URL at build time
// (see .env.example) and every request in src/lib/api.js goes straight to Render.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
