# Lingora e2e

Playwright tests on mobile Chromium (390×844 and 360×740, touch). The config starts the backend
(`gradlew bootTestRun` on port 8181, throwaway PostgreSQL Testcontainer, content seeded from `/content`)
and a production build of the frontend (`vite preview` on port 5183). Docker must be running. The
account mails go to Mailpit (`docker compose up -d mail`, SMTP 1025, API on 8025): the global setup
starts it when it is not running and stops it again after the run; the backend gets
`LINGORA_MAIL_HOST/PORT` and `LINGORA_PUBLIC_URL=http://127.0.0.1:5183`, so the links in the mails
open the e2e frontend.

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

Locally, working-tree mode reuses servers already listening on 8181/5183 (each run registers accounts
of its own, so old accounts do no harm; a reused backend needs the mail settings above for the mail
tests). `head` mode never reuses them: stop such servers first, otherwise the run fails with "port
already used".

## One shared learner per run

The first start can only be seen once per learner: the `setup` project registers the learner through
the welcome screen and the registration form, answers the onboarding questions with "Ich kann kein
Wort", skips the placement test (A0), confirms the address with the link from Mailpit and stores the
session for both phone projects. Every other test of that learner starts from its real state and stays
independent of the order: lessons start from the current node of the path, and expectations come from
the API (`GET /api/path`, `/api/plan/changes`, …).

Every address of a run contains its run id (`e2e-<runId>-<purpose>-<random>@lingora.test`, see
`support/env.ts`), because Mailpit outlives the throwaway database. A test finds its mails by
recipient (`support/mailpit.ts`); the global teardown deletes the run's mails.

## Accounts (M8)

`tests/account` registers learners of its own (through the API where the registration is not the
subject) and covers the registration checks, the verification link and its banner, the password
reset with the end of other sessions, the account settings (name, address, password), the deletion
and the isolation of two learners (screens, API, export; foreign lesson and placement ids answer 404).
The registration modes `invite`/`closed` and the sign-in of the single-user version are fixed when the
backend starts: the backend tests cover them against the API, the e2e tests only show their screens
through `page.route` (`registration-modes.spec.ts`). The known bugs of the M8 review are fixed and
their tests pass. In general, a test marked `test.fail` stands for a known bug of a review: once the
bug is fixed, the test reports that it passed unexpectedly and the marker goes.

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

## Reminders (M9)

`tests/reminders` covers web push without any real push service. The e2e backend (`bootTestRun`)
has a throwaway VAPID key pair and accepts push endpoints on the loopback address over plain HTTP
and on any port (everywhere else only HTTPS on port 443);
the config sets `LINGORA_REMINDER_CRON` to every 5 seconds, so a reminder set to the current minute
goes out at once. `support/pushService.ts` is a stub push service on a free loopback port: each
subscription has a real P-256 key pair and authentication secret, the tests decrypt every message
with Node's crypto (RFC 8291) and verify its VAPID token (RFC 8292), independently of the backend.

- `push-delivery.spec.ts`: the test notification (headers, VAPID, encryption, payload), cleanup of
  subscriptions the push service reports as gone (410), failure counts (500) and the removal after
  five failures in a row, the cap of ten devices per learner (the one subscribed or reached the
  longest time ago goes), the endpoint allow-list (no request forgery, HTTPS on port 443), key
  validation and that devices belong to their learner.
- `reminder-job.spec.ts`: the learner moves into a time zone where it is about midday
  (`support/timeZones.ts`), sets the daily reminder to now and gets it once, with "Jetzt üben", the
  snooze and its single-use token, and a time to live of at most an hour (the lateness limit); the
  snooze needs neither session nor CSRF header. The settings' validation through the API.
- `reminder-settings.spec.ts`, `reminder-nudge.spec.ts`, `service-worker.spec.ts`: the screens and
  the production build's service worker. Where the worker matters, the tests run in a browser profile
  on disk (`chromium.launchPersistentContext`, `support/persistentBrowser.ts`), as an installed
  browser keeps it. Chromium offers no push service under Playwright either way: an off-the-record
  context refuses `pushManager.subscribe()`, a profile on disk waits for Google's push service, and
  the backend would then send to Google. So `support/browserPush.ts` swaps the push service at both
  ends: `pushManager` hands out a subscription at the stub, and the test delivers the message it
  received to the real worker through the DevTools protocol (`ServiceWorker.deliverPushMessage`),
  which shows a real notification (`registration.getNotifications()`). These tests run on the full
  Chromium (`channel: 'chromium'`, `--lang=de-CH`): the headless shell of the other tests reports
  notifications as denied. A tap on a notification cannot be automated; the frontend's unit tests
  cover the click handler, the e2e test sends the app the message the handler sends. The browser's
  subscription goes with its learner: "Abmelden" releases it (a failed sign-out keeps it), so does
  deleting the account, and the next learner on a browser whose session ended without "Abmelden"
  does not take it over. A save refused for an outdated CSRF token goes out again unchanged.

The other tests block service workers, so their browsers cannot receive web push and never see the
reminder suggestion after the first lesson.

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

## Streak celebration and streak screen (M10)

The celebration replaces the result screen in place: `watchForPathFlash` (`pages/StreakCelebration.ts`)
records every URL change through the History API and every element added to the page, and the
tests expect the lesson's URL only and never the bottom navigation or the learning path between the
result and the celebration (the daily-goal test with the shared learner, `tests/streak` with
learners of their own).

The backend has no test clock, so a streak of many days comes from a backup
(`support/streakHistory.ts`): a new learner plays a lesson through the API, exports, and imports the
export again with streak days before today, the stored streak to match, a streak goal, a daily goal
of five minutes and the lesson stretched to 4:40 minutes. An import never extends the streak; the next
lesson meets the goal after twenty seconds, as on any other day, and the backend extends the streak,
reaches the goal and records the day itself. Lowering the daily goal through the settings meets it
without a lesson (no celebration). These learners live in a time zone where it is about midday, so no
day ends during a test.

- `streak-celebration.spec.ts` plays the show with motion (`reducedMotion: 'no-preference'`; all other
  tests reduce motion, where the celebration starts settled) on the page's clock
  (`page.clock`), stopped before the celebration and moved on a frame at a time: the cold flame with
  the streak before (9), the flame catching with embers, the count-up to 10, the settled screen,
  then the trophy of the reached goal of 10 days with the chips 20, 30 and 50 days (`PUT
  /api/streak/goal`) and the path with the burning flame. A second learner's missed yesterday is
  bridged by the freeze: the grey streak screen before, a tap that skips the show (12 → 13 with the
  freeze note) and no trophy for a goal still ahead.
- `streak-screen.spec.ts`: the top-bar flame opens `/streak` with the shared learner's streak (hero,
  today's cell, legend, goal, freeze with the Monday after today); the month navigation (URL
  `?month=`, a year back at most); a learner of its own with bands across weeks, a gap and a frozen
  day (each cell's label, state and band shape against the rules of M10, in whatever month the test
  runs), the reached first goal with its options and "Ziel ändern"; the catalog's streak previews.
- `streak-api.spec.ts`: defaults of a new learner, today and the next Monday in UTC+14 and UTC−10, the
  months, the goal ladder and its refusals, `streak.previous` and `streak.goalReached` of a lesson
  result, the options of a streak past further rungs, export format 5 and the format-4 import, and
  the isolation of two learners.

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
