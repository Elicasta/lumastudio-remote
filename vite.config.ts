import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020"
  },
  server: {
    port: 4177,
    strictPort: true,
    host: true
  },
  preview: {
    port: 4177,
    strictPort: true,
    host: true
  }
});
