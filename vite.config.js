import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    middlewareMode: false,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
