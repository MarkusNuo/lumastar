/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot, type ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { BACKEND_PATHS, devServiceWorkerReset, pwaOptions, themeColorMeta } from './pwa.config.ts';

const backendUrl = process.env.LINGORA_BACKEND_URL ?? 'http://localhost:8080';

const backendProxy: Record<string, ProxyOptions> = Object.fromEntries(
  BACKEND_PATHS.map((path) => [path, { target: backendUrl }]),
);

// Dev and preview share one origin so the backend's session cookie and CSRF setup only know one.
const port = 5173;

// The API contract lives outside this package; setupRules.test.ts reads it to catch drift.
const apiContractDir = fileURLToPath(new URL('../backend/openapi', import.meta.url));
// evaluatorCases.test.ts runs the shared evaluator cases with the Standard-form lexicon.
const contentDir = fileURLToPath(new URL('../content', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(pwaOptions), themeColorMeta(), devServiceWorkerReset()],
  server: {
    port,
    strictPort: true,
    proxy: backendProxy,
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), apiContractDir, contentDir] },
  },
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
    unstubGlobals: true,
    // motion.test.ts reads tokens.css as raw text; other CSS stays unprocessed in tests.
    css: { include: [/tokens\.css/] },
  },
});
