import { execFileSync } from 'node:child_process';
import { MAILPIT, PATHS, RUN_ID } from './env.ts';
import { deleteMailsTo, mailpitIsUp } from './mailpit.ts';

/*
 * Mailpit catches the account mails the tests open (verification, password reset). It runs as the
 * "mail" service of docker-compose.yml; a run starts it when it is not up and stops it again
 * afterwards, while a Mailpit that was already running is left alone. The run's own mails are deleted
 * at the end. The backend sends nothing before the first test, so it may start before this.
 */

const START_TIMEOUT_MS = 60_000;

function compose(...args: string[]): void {
  execFileSync('docker', ['compose', ...args], { cwd: PATHS.repoRoot, stdio: 'inherit' });
}

async function waitUntilUp(): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (!(await mailpitIsUp())) {
    if (Date.now() > deadline) throw new Error(`Mailpit did not answer on ${MAILPIT.api}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  const startedHere = !(await mailpitIsUp());
  if (startedHere) {
    console.log('[e2e] Starting Mailpit (docker compose up -d mail)');
    compose('up', '-d', 'mail');
    await waitUntilUp();
  }

  return async () => {
    if (await mailpitIsUp()) await deleteMailsTo(`e2e-${RUN_ID}-`);
    if (startedHere) {
      console.log('[e2e] Stopping Mailpit');
      compose('stop', 'mail');
    }
  };
}
