import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Build output goes to ../public so NestJS serves the SPA at marathon.alfares.cz.
 * base: '/' for same-origin with /api/v1.
 */
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
});
