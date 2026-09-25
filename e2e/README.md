# Lingora e2e

Playwright tests on mobile Chromium (390×844 and 360×740, touch). The config starts the backend
(`gradlew bootTestRun` on port 8181, throwaway PostgreSQL Testcontainer, content seeded from `/content`)
and a production build of the frontend (`vite preview` on port 5183). Docker must be running.

```bash
npm install && npx playwright install chromium
npm test                   # working tree (default)
E2E_SOURCE=head npm test   # last commit (PowerShell: $env:E2E_SOURCE='head'; npm test)
npm run typecheck
```

## Source modes

| `E2E_SOURCE` | Servers run from | Use it when |
|---|---|---|
| unset / `worktree` | `backend/`, `frontend/` of the working tree | checking your own uncommitted change |
| `head` | an export of `HEAD` in `.tmp/e2e-head/` | others edit the shared working tree; the run only sees committed code |

In `head` mode the config exports `backend/`, `frontend/` and `content/` of `HEAD` with `git archive`
before the servers start. The export is refreshed only when one of the three folders changed in `HEAD`;
`backend/build`, `backend/.gradle` and `frontend/node_modules` are kept, and `npm ci` runs only when
the lockfile changed. The tests themselves always come from the working tree's `e2e/`.

Locally, working-tree mode reuses servers already listening on 8181/5183 (the setup test then signs in
instead of creating the account). `head` mode never reuses them: stop such servers first, otherwise the
run fails with "port already used".

## Screenshots

Every core screen is saved to `screenshots/<milestone>/<width>x<height>/` for the visual review
(PRD 12.5). The milestone is set in `support/env.ts` or via `LINGORA_E2E_MILESTONE`.
