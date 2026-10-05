# Lingora e2e

Playwright tests on mobile Chromium (390×844 and 360×740, touch). The config starts the backend
(`gradlew bootTestRun` on port 8181, throwaway PostgreSQL Testcontainer, content seeded from `/content`)
and a production build of the frontend (`vite preview` on port 5183). Docker must be running.

```bash
npm install && npx playwright install chromium
npm test                   # working tree (default)
E2E_SOURCE=head npm test   # last commit (PowerShell: $env:E2E_SOURCE='head'; npm test)
E2E_SOURCE=head E2E_REF=<commit> npm test   # a given commit instead of HEAD
npm run typecheck
```

## Source modes

| `E2E_SOURCE` | Servers run from | Use it when |
|---|---|---|
| unset / `worktree` | `backend/`, `frontend/` of the working tree | checking your own uncommitted change |
| `head` | an export of `HEAD` in `.tmp/e2e-head/` | others edit the shared working tree; the run only sees committed code |

In `head` mode the config exports `backend/`, `frontend/` and `content/` of `HEAD` (or of `E2E_REF`)
with `git archive` before the servers start. The export is refreshed only when one of the three folders changed;
`backend/build`, `backend/.gradle` and `frontend/node_modules` are kept, and `npm ci` runs only when
the lockfile changed. The tests themselves always come from the working tree's `e2e/`.

The backend runs with a fixed `lingora.lesson.random-seed`, so the same tests get the same lessons.

Locally, working-tree mode reuses servers already listening on 8181/5183 (the setup test then signs in
instead of creating the account). `head` mode never reuses them: stop such servers first, otherwise the
run fails with "port already used".

## One learner per run

The instance has a single account, so the first start can only be seen once per run: the `setup`
project creates the account, answers the onboarding questions with "Ich kann kein Wort", skips the
placement test (A0) and stores the session for both phone projects. Every other test starts from the
learner's real state and stays independent of the order: lessons start from the current node of the
path, and expectations come from the API (`GET /api/path`, `/api/plan/changes`, …).

"Neu einstufen" runs a full placement test through the UI. The API sends no solutions, so the test
reads `placement.json` of the seeded content (`PATHS.content`) and answers every item wrong for sure:
the staircase ends at A0 whichever items the (unseeded) engine picks.

## Screenshots

Every core screen is saved to `screenshots/<milestone>/<width>x<height>/` for the visual review
(PRD 12.5). The milestone is set in `support/env.ts` or via `LINGORA_E2E_MILESTONE`.
