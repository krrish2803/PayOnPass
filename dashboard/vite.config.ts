import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served by FastAPI under /app (same origin as the API in production).
// In dev, set VITE_API_BASE=http://localhost:8000 and the backend's CORS allows it.
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: { port: 5174, host: true },
  build: { target: 'esnext', sourcemap: false, outDir: 'dist' },
});
