/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

const backendUrl = process.env.LINGORA_BACKEND_URL ?? 'http://localhost:8080';

const backendProxy: Record<string, ProxyOptions> = Object.fromEntries(
  ['/api', '/v3', '/actuator'].map((path) => [path, { target: backendUrl }]),
);

// Dev and preview share one origin so the backend's session cookie and CSRF setup only know one.
const port = 5173;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port, strictPort: true, proxy: backendProxy },
  preview: { port, strictPort: true, proxy: backendProxy },
  build: {
    rolldownOptions: {
      output: {
        // Rarely changing vendor code gets its own long-cacheable chunks.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // motion.test.ts reads tokens.css as raw text; other CSS stays unprocessed in tests.
    css: { include: [/tokens\.css/] },
  },
});
