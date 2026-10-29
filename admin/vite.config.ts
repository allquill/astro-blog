import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The API is always same-origin: in dev this proxy forwards /api to server/ (pnpm run dev:api), in
// Docker nginx does. changeOrigin stays false so the Host header remains localhost:5175 — the API's
// SameOriginGuard compares it with the Origin of every state-changing request (CSRF defence).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3002', changeOrigin: false },
    },
  },
  preview: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3002', changeOrigin: false },
    },
  },
});
