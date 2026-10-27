import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The UI calls /api/* and Vite forwards it to the Node backend (no CORS headaches in dev).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
});
