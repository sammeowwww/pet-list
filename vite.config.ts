import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/.wrangler/**', '**/.cache/**', '**/test-results/**', '**/screenshots/**'] }, proxy: { '/api': { target: 'http://127.0.0.1:8788', changeOrigin: false } } },
  test: { include: ['src/**/*.test.ts'] },
});
