# Lumastar

Lumastar is an adaptive, playful language-learning app you can host yourself. It places you with a short
adaptive test, builds a personal learning plan up to C2 and composes every lesson from what you know,
what you get wrong and what is due for review.

The first course teaches **Gheg Albanian** (Kosovo variety) to German speakers.

## Features

- **Placement test:** an adaptive test of at most 20 items that sets your starting level per skill.
- **Learning plan and path:** a personal plan up to C2 that skips what you already know, shown as a
  learning path with units, focus lessons and checkpoints.
- **Adaptive lessons:** six exercise types. Answers are checked instantly in the browser and authoritatively
  on the server. The server tolerates missing diacritics and typos, recognises standard-language forms
  and gives hints for typical mistakes.
- **Spaced repetition:** reviews scheduled with FSRS-6, rated automatically from your answers.
- **Motivation:** XP, a daily goal, streaks with a weekly streak freeze, streak goals, level badges,
  statistics and a full-screen streak celebration.
- **Accounts:** multi-user accounts with e-mail verification and password reset. Registration can be
  open, invite-only or closed.
- **Reminders:** native push reminders when the app is installed as a PWA (daily reminder and a
  "streak at risk" reminder).
- **Your data:** a ZIP export and import of all your data, including learner-profile documents.

## Tech stack

| Area | Technology |
|---|---|
| Backend | Java 25, Spring Boot 4, Spring Security, Flyway, PostgreSQL 18 |
| Spaced repetition | FSRS-6 (`io.github.open-spaced-repetition:fsrs`) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Motion |
| API contract | OpenAPI (springdoc), generated TypeScript client |
| Tests | JUnit 5, Testcontainers, Vitest, Testing Library, Playwright |

## Getting started

### Prerequisites

- JDK 21 or newer (Gradle downloads JDK 25 automatically)
- Node.js 24
- Docker (for PostgreSQL, the local mail catcher and the integration tests)

### Run it locally

```bash
git clone https://github.com/MarkusNuo/lumastar.git
cd lumastar

# PostgreSQL on localhost:5433 and Mailpit (mail catcher) on http://localhost:8025
docker compose up -d db mail

# API on http://localhost:8080 (Swagger UI at /swagger-ui.html)
cd backend && ./gradlew bootRun

# in a second terminal: the app on http://localhost:5173
cd frontend && npm install && npm run dev
```

On Windows use `gradlew.bat` instead of `./gradlew`.

Open http://localhost:5173 and register an account. In development, all account mails (verification,
password reset) end up in Mailpit at http://localhost:8025. The course content in `content/` is imported
into the database on every backend start.

To try it without the Compose database, run `cd backend && ./gradlew bootTestRun`. This starts PostgreSQL
in a throwaway Testcontainer.

## Running the tests

```bash
cd backend && ./gradlew build                     # unit and Testcontainers integration tests
cd frontend && npm run verify                     # typecheck, lint, unit tests, production build
cd content && npm install && npm run validate     # content schemas, ids, Gheg blocklist
cd e2e && npm install && npx playwright install chromium && npm test   # end-to-end, starts the app itself
```

## Useful commands

```bash
cd backend && ./gradlew exportOpenApi       # regenerate backend/openapi/openapi.json
cd frontend && npm run gen:api              # regenerate the TypeScript API client from it
cd backend && ./gradlew generateVapidKeys   # key pair for web push reminders
```

## Configuration

The backend reads its settings from environment variables. The defaults fit local development.

| Variable | Default | Purpose |
|---|---|---|
| `LUMASTAR_DB_URL` | `jdbc:postgresql://localhost:5433/lumastar` | JDBC URL |
| `LUMASTAR_DB_USER` / `LUMASTAR_DB_PASSWORD` | `lumastar` / `lumastar` | Database credentials |
| `LUMASTAR_CONTENT_PATH` | `../content` | Content folder imported on startup |
| `LUMASTAR_PUBLIC_URL` | `http://localhost:5173` | Base URL used in mail links |
| `LUMASTAR_REGISTRATION_MODE` | `open` | `open`, `invite` (needs `LUMASTAR_REGISTRATION_INVITE_CODE`) or `closed` |
| `LUMASTAR_REGISTRATION_INVITE_CODE` | – | Shared invite code for `invite` mode |
| `LUMASTAR_MAIL_HOST` / `LUMASTAR_MAIL_PORT` | `localhost` / `1025` | SMTP server (Mailpit in development) |
| `LUMASTAR_MAIL_SMTP_AUTH` / `LUMASTAR_MAIL_STARTTLS` | `false` / `false` | SMTP authentication and STARTTLS |
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | – | SMTP credentials |
| `LUMASTAR_MAIL_FROM` | `Lumastar <noreply@lumastar.local>` | Sender of account mails |
| `LUMASTAR_COOKIE_SECURE` | `false` | Set to `true` behind HTTPS |
| `LUMASTAR_FORWARD_HEADERS_STRATEGY` | `none` | Set to `native` behind a reverse proxy |
| `LUMASTAR_PUSH_PUBLIC_KEY` / `LUMASTAR_PUSH_PRIVATE_KEY` | – | VAPID key pair for web push; push is off without them |
| `LUMASTAR_PUSH_SUBJECT` | public URL | VAPID contact (`mailto:` or URL) |
| `LUMASTAR_REMINDER_CRON` | every 5 min | Reminder job schedule (`-` disables it) |

## Self-hosting

`docker/` contains a production setup with three containers: PostgreSQL, the API and Caddy. Caddy serves
the app, forwards `/api` and obtains the TLS certificate automatically. Both images are built from source.

```bash
cp docker/.env.example docker/.env      # set your domain, a database password and the registration mode
docker compose -f docker/compose.yml up -d --build
```

Point your domain's DNS at the server first, so Caddy can obtain the certificate. To update, pull the new
version and run the same `up -d --build` command again. Database migrations run automatically on start.

### Backups

All learner data lives in PostgreSQL. Back it up regularly, e.g. daily via cron:

```bash
docker compose -f docker/compose.yml exec -T db pg_dump -U lumastar -Fc lumastar > lumastar-$(date +%F).dump
```

Restore a dump with `pg_restore -U lumastar -d lumastar --clean <file>`. The in-app export (a ZIP with JSON
data and Markdown profile documents) is a second, portable backup for each learner.

## Project structure

| Folder | Contents |
|---|---|
| `backend/` | Spring Boot API, Flyway migrations, the adaptive learning logic (`app.lumastar.core`) |
| `frontend/` | React PWA, design tokens and the component catalog (`/dev/ui`) |
| `content/` | Language guide, curriculum, units and exercises (JSON) with their schemas and validator |
| `e2e/` | Playwright end-to-end tests on mobile viewports |
| `docker/` | Production images and Compose setup |
| `docs/` | The content format shared by `content/` and the backend importer |

## Status

- **Content:** the Gheg content covers A0–A2. B1–C2 exist as a plan outline only. None of the exercises
  has been reviewed yet (`"reviewed": false`), so treat them as drafts.
- **AI:** the interfaces for a later AI-assisted planning and lesson mode exist. The app runs on its
  rule-based engines.

## License

Copyright (C) 2026 MarkusNuo

- **Code** — everything in this repository except the course content below, including the content
  validator (`content/scripts/`) and the schemas (`content/schema/`) — is licensed under the
  [GNU Affero General Public License v3.0 only](LICENSE) (`AGPL-3.0-only`). You may use, change and host it,
  also commercially, as long as you publish the complete source code of your version under the same
  license — this includes versions that are only offered over a network.
- **Course content** — `content/LANGUAGE_GUIDE.md`, `curriculum.json`, `placement.json`, `skill_tags.json`,
  `gheg_blocklist.json`, `units/` and `fixtures/` — is licensed under
  [Creative Commons Attribution-NonCommercial-ShareAlike 4.0](content/LICENSE) (`CC-BY-NC-SA-4.0`):
  no commercial use, adaptations under the same license.
- **Name and logo** are not covered by these licenses; your own version needs its own name.
- **Other terms**, e.g. a commercial license, are available from the author (GitHub: @MarkusNuo).
- **Third-party parts** keep their own licenses: the Nunito font (SIL Open Font License 1.1), Phosphor Icons
  (MIT) and the libraries listed in `frontend/package.json` and `backend/build.gradle.kts`.
