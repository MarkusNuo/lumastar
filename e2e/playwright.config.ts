import { mkdirSync } from 'node:fs';
import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';
import {
  BACKEND_PORT,
  BACKEND_URL,
  FRONTEND_PORT,
  FRONTEND_URL,
  HOST,
  PATHS,
  SOURCE,
} from './support/env.ts';
import { exportHead, type SourceRoots } from './support/headSource.ts';
import { PHONES } from './support/phones.ts';

type WebServer = Extract<NonNullable<PlaywrightTestConfig['webServer']>, { command: string }>;

const isCI = Boolean(process.env.CI);
const isWindows = process.platform === 'win32';

/** HEAD mode never reuses a running server: it may run the working tree instead of the commit. */
const reuseExistingServer = !isCI && SOURCE === 'worktree';

const roots: SourceRoots =
  SOURCE === 'head'
    ? exportHead(PATHS.repoRoot, PATHS.headExport)
    : { backend: PATHS.backend, frontend: PATHS.frontend };

/**
 * Full app on a throwaway PostgreSQL Testcontainer: every run starts with an empty database and the
 * content seeded from /content. A reused server (local working-tree runs only) keeps its account;
 * the setup project then signs in instead of creating it.
 */
function backendServer(cwd: string): WebServer {
  const gradle = isWindows ? '.\\gradlew.bat' : './gradlew';
  if (isWindows) mkdirSync(PATHS.gradleTemp, { recursive: true });
  return {
    name: 'backend',
    command: `${gradle} bootTestRun --args=--server.port=${BACKEND_PORT} --console=plain`,
    cwd,
    // The JDK on the Windows dev machine cannot open its loopback socket in the user temp dir.
    env: isWindows ? { TEMP: PATHS.gradleTemp, TMP: PATHS.gradleTemp } : {},
    url: `${BACKEND_URL}/actuator/health`,
    // Compiling, pulling the PostgreSQL image and seeding take a while on the first run.
    timeout: 6 * 60_000,
    reuseExistingServer,
    stdout: 'ignore',
    stderr: 'pipe',
  };
}

/**
 * Production build served by `vite preview`, whose proxy forwards /api and /actuator to the backend.
 * The build goes to e2e/.frontend-dist so it never overwrites frontend/dist.
 */
function frontendServer(cwd: string): WebServer {
  const vite = `node node_modules/vite/bin/vite.js`;
  const outDir = `--outDir "${PATHS.frontendDist}"`;
  return {
    name: 'frontend',
    command: `${vite} build ${outDir} --emptyOutDir --logLevel warn && ${vite} preview ${outDir} --host ${HOST} --port ${FRONTEND_PORT} --strictPort`,
    cwd,
    env: { LINGORA_BACKEND_URL: BACKEND_URL },
    url: FRONTEND_URL,
    timeout: 3 * 60_000,
    reuseExistingServer,
    stdout: 'ignore',
    stderr: 'pipe',
  };
}

const signedInPhones = Object.entries(PHONES).map(([name, phone]) => ({
  name,
  testMatch: /\.spec\.ts$/,
  dependencies: ['setup'],
  use: { ...phone, storageState: PATHS.authState },
}));

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  // One single-user instance per run: tests share its account, so they run one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    colorScheme: 'dark',
    // Motion jumps to its end state, which keeps screenshots stable; the layout is the same.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [frontendServer(roots.frontend), backendServer(roots.backend)],
  projects: [
    // Runs first and exactly once: sees the empty instance, creates the account, saves its session.
    { name: 'setup', testMatch: /\.setup\.ts$/, use: { ...PHONES['phone-390'] } },
    ...signedInPhones,
  ],
});
