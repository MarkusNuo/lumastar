import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/*
 * E2E_SOURCE=head: the servers run from an export of the last commit (or of E2E_REF) instead of the
 * shared working tree, so half-finished local edits cannot break a run. The export is
 * refreshed only when the committed backend/, frontend/ or content/ changed; build output and
 * node_modules are kept.
 */

const AREAS = ['backend', 'frontend', 'content'] as const;
type Area = (typeof AREAS)[number];

/** Survive a refresh, so a new commit costs an incremental build instead of a clean one. */
const KEPT: Record<Area, readonly string[]> = {
  backend: ['.gradle', 'build'],
  frontend: ['node_modules'],
  content: ['node_modules'],
};

interface ExportMarker {
  commit: string;
  trees: Record<Area, string>;
  lockfile: string;
}

export interface SourceRoots {
  backend: string;
  frontend: string;
}

/** Set by the runner process; workers evaluate the config again and must not export a newer HEAD. */
const EXPORTED_ENV = 'LUMASTAR_E2E_HEAD_EXPORTED';

export function exportHead(repoRoot: string, target: string, ref: string): SourceRoots {
  const roots = { backend: path.join(target, 'backend'), frontend: path.join(target, 'frontend') };
  if (process.env[EXPORTED_ENV]) return roots;

  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  // Resolved once, so a commit landing meanwhile cannot mix two versions into one export.
  const commit = git('rev-parse', '--verify', `${ref}^{commit}`);
  const wanted: ExportMarker = {
    commit,
    trees: Object.fromEntries(AREAS.map((area) => [area, git('rev-parse', `${commit}:${area}`)])) as Record<
      Area,
      string
    >,
    lockfile: git('rev-parse', `${commit}:frontend/package-lock.json`),
  };
  const markerFile = path.join(target, 'export.json');
  const previous = readMarker(markerFile);
  const log = (message: string) => console.log(`[e2e] ${message} (${ref} ${wanted.commit.slice(0, 9)})`);

  if (!previous || AREAS.some((area) => previous.trees[area] !== wanted.trees[area])) {
    log(`Exporting ${AREAS.join(', ')} to ${target}`);
    rmSync(markerFile, { force: true });
    clean(target);
    extract(repoRoot, target, wanted.commit);
  } else {
    log('Reusing the export');
  }

  if (previous?.lockfile !== wanted.lockfile || !existsSync(path.join(roots.frontend, 'node_modules'))) {
    log('Installing frontend dependencies');
    execSync('npm ci --no-audit --no-fund --prefer-offline', { cwd: roots.frontend, stdio: 'inherit' });
  }

  writeFileSync(markerFile, `${JSON.stringify(wanted, null, 2)}\n`);
  process.env[EXPORTED_ENV] = wanted.commit;
  return roots;
}

function readMarker(file: string): ExportMarker | undefined {
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as ExportMarker;
  } catch {
    return undefined;
  }
}

/** Removes the previous export except the kept build output and dependencies. */
function clean(target: string): void {
  for (const area of AREAS) {
    const dir = path.join(target, area);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!KEPT[area].includes(entry)) rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  }
}

/** `git archive <commit>` piped into tar; tar runs inside the target so no path needs escaping. */
function extract(repoRoot: string, target: string, commit: string): void {
  mkdirSync(target, { recursive: true });
  const archive = execFileSync('git', ['archive', '--format=tar', commit, ...AREAS], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 1024,
  });
  execFileSync('tar', ['-x', '-f', '-'], { cwd: target, input: archive });
}
