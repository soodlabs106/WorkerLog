import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4318,
    strictPort: true,
    proxy: {
      "/api/admin-reset-password": {
        target: "https://yjnbwxneozequrwhzqvg.supabase.co",
        changeOrigin: true,
        rewrite: () => "/functions/v1/admin-reset-password",
      },
    },
  },
  preview: {
    port: 4319,
    strictPort: true,
  },
});
