import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5188,
    strictPort: true,
    proxy: {
      "/api": {
        target: "https://omega-seven-mu.vercel.app",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
  },
});
