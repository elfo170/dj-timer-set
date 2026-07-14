import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Configuração recomendada pelo Tauri v2 para o dev server
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
