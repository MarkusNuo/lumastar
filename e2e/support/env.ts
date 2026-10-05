import { fileURLToPath } from 'node:url';

/** Dedicated e2e ports, so a run never collides with the dev servers (8080, 8099, 5173). */
export const BACKEND_PORT = 8181;
export const FRONTEND_PORT = 5183;

/**
 * IPv4 loopback instead of "localhost": vite preview then listens on exactly the address the browser
 * dials. With "localhost" it bound ::1 only and Chromium once got ERR_CONNECTION_REFUSED for an asset.
 */
export const HOST = '127.0.0.1';
export const BACKEND_URL = `http://${HOST}:${BACKEND_PORT}`;
export const FRONTEND_URL = `http://${HOST}:${FRONTEND_PORT}`;

/** Screenshots land in screenshots/<milestone>/; bump per milestone or override via env. */
export const MILESTONE = process.env.LINGORA_E2E_MILESTONE ?? 'm5';

/**
 * Which code the servers run: the working tree (default) or the last commit (E2E_SOURCE=head), which
 * stays stable while edits continue in backend/, frontend/ and content/ in the shared working tree.
 */
export type Source = 'worktree' | 'head';

function sourceFromEnv(value: string | undefined): Source {
  if (value === undefined || value === '' || value === 'worktree') return 'worktree';
  if (value === 'head') return 'head';
  throw new Error(`E2E_SOURCE must be "worktree" or "head", not "${value}"`);
}

export const SOURCE: Source = sourceFromEnv(process.env.E2E_SOURCE);

/**
 * The commit E2E_SOURCE=head exports: HEAD unless E2E_REF names another one, e.g. the last commit
 * before an unfinished change changed a flow the tests depend on.
 */
export const SOURCE_REF = process.env.E2E_REF?.trim() || 'HEAD';

const fromE2eRoot = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

export const PATHS = {
  repoRoot: fromE2eRoot('..'),
  backend: fromE2eRoot('../backend'),
  frontend: fromE2eRoot('../frontend'),
  /** Project-local temp dir; the JDK on the Windows dev machine cannot use the user temp dir. */
  gradleTemp: fromE2eRoot('../.tmp'),
  /** Export of HEAD for E2E_SOURCE=head (inside the gitignored .tmp). */
  headExport: fromE2eRoot('../.tmp/e2e-head'),
  /** The content the backend seeds: of the exported commit in HEAD mode, else of the working tree. */
  content: fromE2eRoot(SOURCE === 'head' ? '../.tmp/e2e-head/content' : '../content'),
  /** Own build output, so e2e never overwrites frontend/dist while the frontend is being worked on. */
  frontendDist: fromE2eRoot('.frontend-dist'),
  authState: fromE2eRoot('.auth/learner.json'),
  screenshots: fromE2eRoot(`screenshots/${MILESTONE}`),
} as const;
