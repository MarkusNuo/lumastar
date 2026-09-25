// Contract drift check (part of `npm run verify`): regenerates the API types from the backend's
// OpenAPI spec into a temporary file and fails if they differ from the committed src/api/schema.d.ts.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// An explicit spec path (e.g. an export of the committed spec) overrides the working-tree file.
const spec = process.argv[2] ?? join(root, '..', 'backend', 'openapi', 'openapi.json');
const committed = join(root, 'src', 'api', 'schema.d.ts');
const tempDir = join(root, 'node_modules', '.tmp');
const generated = join(tempDir, 'schema.check.d.ts');

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('openapi-typescript/package.json')), 'bin', 'cli.js');

mkdirSync(tempDir, { recursive: true });
try {
  execFileSync(process.execPath, [cli, spec, '-o', generated], { stdio: 'pipe' });
  // Git may check files out with CRLF on Windows; only the content counts.
  const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (read(generated) !== read(committed)) {
    console.error(`src/api/schema.d.ts is out of date with ${spec}. Run "npm run gen:api".`);
    process.exit(1);
  }
  console.log(`API client matches ${spec}.`);
} finally {
  rmSync(generated, { force: true });
}
