# Lingora e2e

Playwright tests on mobile Chromium (390×844 and 360×740, touch). The config starts the backend
(`gradlew bootTestRun` on port 8181, throwaway PostgreSQL Testcontainer, content seeded from `/content`)
and a production build of the frontend (`vite preview` on port 5183). Docker must be running.

Projects run in this order: `setup` (first start), `daily-goal`, `phone-390` and `phone-360` (all
other tests), then `levelup-phone-390` and `levelup-phone-360`. A full run takes about a quarter of
an hour, five minutes of it the daily-goal test.

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

The backend runs with a fixed `lingora.lesson.random-seed` and `lingora.placement.random-seed`, so the
same tests get the same lessons and placement items.

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
the staircase ends at A0 whichever items the engine picks. The seed makes the items of a run
reproducible, but a fixed answer per screen would still break with every content change, so the test
keeps reading the solutions.

As the tests play lessons, the learner's stage fills up: once its units are done, the path shows the
open checkpoint as the next step and the lessons after it stay playable. The path tests follow the
frontend's rule for that (`checkpointAsNextStep`), and lessons start from the next node of the unit in
progress. Focus units the plan holds open are played through the API first where a test needs a
lesson of a curriculum unit (`finishOpenFocusUnits`).

## Daily goal and streak

The daily goal counts the minutes from the start to the end of every lesson, and only the lesson that
first meets it extends the streak and shows the streak celebration, once a day. `tests/daily-goal`
therefore runs in its own project right after `setup`, before any other lesson of the run: it sets a
5-minute goal in the profile, plays a lesson that takes five minutes (it waits before the last answer),
checks the "Tagesziel" card, the celebration and the top bar, and sets the onboarding goal (15 min)
again. It is the slowest test (about five minutes). Every other test leaves a lesson end through
`LessonResultScreen.leave(result)`, which also passes the celebration should a lesson meet the goal,
e.g. in a run past midnight. Its lesson is the first of a fresh instance and is composed the same in
every run, so it also gives the screenshots of every exercise type and feedback sheet at both sizes.

A finished placement test counts as practice time too, and the level reveal of a test that first meets
the goal is followed by the same celebration. One day can only be met once, and the lesson above meets
it, so `tests/placement` checks the `dailyGoal` and `streak` of the placement result against
`GET /api/progress/today` and that the reveal leads straight to the plan (the frontend's unit tests
cover the flame after the reveal).

## Platform tests

`tests/platform` checks PRD 13: the web app manifest and the service worker of the production build
(the worker must leave `/api` to the network), app start under 2 s and exercise switches under 100 ms
(measured in the browser with an init script; the results are test annotations in the report) and that
no screen requests anything from another host. All other tests block service workers
(`serviceWorkers: 'block'`), so `page.route` sees every request and each page load is a cold start.

## Level-up projects

Passing a checkpoint moves the learner up for good, so `tests/levelup/` runs in the projects
`levelup-phone-390` and `levelup-phone-360`, after both phone projects (and one after the other).
They play the lessons of the stage through the API (`support/progression.ts`) and the checkpoint
itself through the UI: a failed try, then the level-up. The badge test passes stages through the
API until a checkpoint completes a CEFR band (A1.3, then A2.3 in the second project): it plays more
lessons than any other test (about half a minute) and is tagged `@slow`;
`npx playwright test --grep-invert @slow` leaves it out. A failure in a phone project skips the
level-up projects (they depend on it).

Reviews (`tests/review`): the backend has no test clock, so the test relies on the FSRS learning steps:
a wrong answer on an item still being learned is due again after one minute (a known item lapses into
relearning and is due only after ten minutes, so the test reads the cards from the export and makes its
mistakes on new items). When nothing is due, the test waits up to two minutes for such a card. The review summary counts only cards
a review lesson can practise, so the test expects a review to start whenever something is due.

## Screenshots

Every core screen is saved to `screenshots/<milestone>/<width>x<height>/` for the visual review
(PRD 12.5). The milestone is set in `support/env.ts` or via `LINGORA_E2E_MILESTONE`.
