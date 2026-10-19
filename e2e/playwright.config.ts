import { mkdirSync } from 'node:fs';
import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';
import { CONTEXT_OPTIONS } from './support/browserContext.ts';
import {
  BACKEND_PORT,
  BACKEND_URL,
  FRONTEND_PORT,
  FRONTEND_URL,
  HOST,
  MAILPIT,
  PATHS,
  SOURCE,
  SOURCE_REF,
} from './support/env.ts';
import { exportHead, type SourceRoots } from './support/headSource.ts';
import { PHONES } from './support/phones.ts';

type WebServer = Extract<NonNullable<PlaywrightTestConfig['webServer']>, { command: string }>;

const isCI = Boolean(process.env.CI);
/** Seed of the backend's lesson composer (lumastar.lesson.random-seed); older commits ignore it. */
const LESSON_SEED = 20261005;
/** Seed of the placement engine's pick among the items of a stage (lumastar.placement.random-seed). */
const PLACEMENT_SEED = 20261005;
/** Spring cron of the reminder job: every 5 seconds, so a reminder set to "now" goes out at once. */
const REMINDER_CRON = '*/5 * * * * *';
const isWindows = process.platform === 'win32';

/** HEAD mode never reuses a running server: it may run the working tree instead of the commit. */
const reuseExistingServer = !isCI && SOURCE === 'worktree';

const roots: SourceRoots =
  SOURCE === 'head'
    ? exportHead(PATHS.repoRoot, PATHS.headExport, SOURCE_REF)
    : { backend: PATHS.backend, frontend: PATHS.frontend };

/**
 * Full app on a throwaway PostgreSQL Testcontainer: every run starts with an empty database and the
 * content seeded from /content. A reused server (local working-tree runs only) keeps the accounts of
 * earlier runs, which is harmless: every run registers accounts with addresses of its own.
 */
function backendServer(cwd: string): WebServer {
  const gradle = isWindows ? '.\\gradlew.bat' : './gradlew';
  if (isWindows) mkdirSync(PATHS.gradleTemp, { recursive: true });
  return {
    name: 'backend',
    // Fixed seeds make the composed lessons and placement tests the same in every run of the same tests.
    command: `${gradle} bootTestRun "--args=--server.port=${BACKEND_PORT} --lumastar.lesson.random-seed=${LESSON_SEED} --lumastar.placement.random-seed=${PLACEMENT_SEED}" --console=plain`,
    cwd,
    env: {
      // Account mails go to Mailpit, and their links to the pages of the e2e frontend.
      LUMASTAR_MAIL_HOST: HOST,
      LUMASTAR_MAIL_PORT: String(MAILPIT.smtpPort),
      LUMASTAR_PUBLIC_URL: FRONTEND_URL,
      // The reminder job looks for due reminders every 5 seconds instead of every 5 minutes (M9).
      LUMASTAR_REMINDER_CRON: REMINDER_CRON,
      // The JDK on the Windows dev machine cannot open its loopback socket in the user temp dir.
      ...(isWindows ? { TEMP: PATHS.gradleTemp, TMP: PATHS.gradleTemp } : {}),
    },
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
    env: { LUMASTAR_BACKEND_URL: BACKEND_URL },
    url: FRONTEND_URL,
    timeout: 3 * 60_000,
    reuseExistingServer,
    stdout: 'ignore',
    stderr: 'pipe',
  };
}

/** Checkpoints move the single learner up for good, so they run last: after every other test. */
const LEVEL_UP = /[\\/]levelup[\\/].*\.spec\.ts$/;

/**
 * Only the lesson that first meets today's goal extends the streak and gets the celebration, once a
 * day: these tests run right after the setup, before any other lesson of the run.
 */
const DAILY_GOAL = /[\\/]daily-goal[\\/].*\.spec\.ts$/;

const signedInPhones = Object.entries(PHONES).map(([name, phone]) => ({
  name,
  testMatch: /\.spec\.ts$/,
  testIgnore: [LEVEL_UP, DAILY_GOAL],
  dependencies: ['daily-goal'],
  use: { ...phone, storageState: PATHS.authState },
}));

/**
 * The level-up tests per phone, one project after the other: each passes the checkpoint of the
 * learner's stage, so the second one continues where the first left the learner.
 */
const phoneNames = Object.keys(PHONES);
const levelUpPhones = Object.entries(PHONES).map(([name, phone], index) => ({
  name: `levelup-${name}`,
  testMatch: LEVEL_UP,
  dependencies: index === 0 ? phoneNames : [`levelup-${phoneNames[index - 1]}`],
  use: { ...phone, storageState: PATHS.authState },
}));

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  // Most tests share the learner of the setup project and its daily goal, so they run one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  // Makes sure Mailpit catches the account mails; stops it afterwards if the run started it.
  globalSetup: './support/globalSetup.ts',
  use: {
    ...CONTEXT_OPTIONS,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [frontendServer(roots.frontend), backendServer(roots.backend)],
  projects: [
    // Runs first and exactly once: registers the shared learner, confirms its address, saves its session.
    { name: 'setup', testMatch: /\.setup\.ts$/, use: { ...PHONES['phone-390'] } },
    {
      name: 'daily-goal',
      testMatch: DAILY_GOAL,
      dependencies: ['setup'],
      use: { ...PHONES['phone-390'], storageState: PATHS.authState },
    },
    ...signedInPhones,
    ...levelUpPhones,
  ],
});
