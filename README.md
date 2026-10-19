# Lingora

Adaptive learning app for German speakers learning **Gheg Albanian** (Kosovo-Gheg): placement test,
personal learning plan up to C2, dynamically composed lessons, FSRS-6 reviews, streaks and XP.
Multi-user (e-mail accounts) with web-push streak reminders, for your own server. Product requirements: [`PRD.md`](PRD.md).

## Quick start (local development)

Requirements: JDK 21+ (Gradle provisions JDK 25 automatically), Node 24, Docker.

```bash
docker compose up -d db mail            # PostgreSQL 18 on localhost:5433, Mailpit on http://localhost:8025
cd backend && ./gradlew bootRun         # API on http://localhost:8080 (Windows: gradlew.bat)
cd frontend && npm install && npm run dev   # app on http://localhost:5173
```

On this Windows machine the JDK cannot open its loopback socket in the default temp folder; run Gradle
with a project-local temp dir (PowerShell: `$env:TEMP=$env:TMP='C:\dev\lingora\.tmp'`).

Open http://localhost:5173, register an account and start learning. In development all mails (verification,
password reset) land in Mailpit at http://localhost:8025.
The production build (`npm run build`) is an installable PWA; hosting it behind a TLS reverse proxy
is not part of the app milestones (see `QUESTIONS.md`).
The content in `/content` is imported into the database on every backend start.

A throwaway demo without the compose database: `cd backend && ./gradlew bootTestRun`
(starts PostgreSQL in a Testcontainer).

## Tests

```bash
cd backend && ./gradlew build           # unit + Testcontainers integration tests
cd frontend && npm run verify           # typecheck, lint, unit tests, build
cd content && npm install && npm run validate   # content schema + Gheg blocklist
cd e2e && npm install && npx playwright install chromium && npm test
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `LINGORA_DB_URL` | `jdbc:postgresql://localhost:5433/lingora` | JDBC URL |
| `LINGORA_DB_USER` / `LINGORA_DB_PASSWORD` | `lingora` / `lingora` | Database credentials (change in production) |
| `LINGORA_CONTENT_PATH` | `../content` | Content folder imported on startup |
| `LINGORA_PUBLIC_URL` | `http://localhost:5173` | Base URL used in mail links |
| `LINGORA_REGISTRATION_MODE` | `open` | `open`, `invite` (needs `LINGORA_REGISTRATION_INVITE_CODE`) or `closed` |
| `LINGORA_REGISTRATION_INVITE_CODE` | – | Shared invite code for `invite` mode |
| `LINGORA_MAIL_HOST` / `LINGORA_MAIL_PORT` | `localhost` / `1025` | SMTP server (Mailpit in development) |
| `LINGORA_MAIL_SMTP_AUTH` / `LINGORA_MAIL_STARTTLS` | `false` / `false` | SMTP authentication and STARTTLS |
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | – | SMTP credentials (set only on the server) |
| `LINGORA_MAIL_FROM` | `Lingora <noreply@lingora.local>` | Sender of account mails |
| `LINGORA_COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `LINGORA_FORWARD_HEADERS_STRATEGY` | `none` | Set `native` behind a reverse proxy (Caddy), otherwise all clients share one rate-limit key |
| `LINGORA_PUSH_PUBLIC_KEY` / `LINGORA_PUSH_PRIVATE_KEY` | – | VAPID key pair for web push (`./gradlew generateVapidKeys`); push is off without them |
| `LINGORA_PUSH_SUBJECT` | public URL | VAPID contact (`mailto:` or URL) |
| `LINGORA_REMINDER_CRON` | every 5 min | Reminder job schedule (`-` disables it) |

## Backups

All learner data lives in PostgreSQL. Back it up regularly, e.g. daily via cron:

```bash
docker compose exec -T db pg_dump -U lingora -Fc lingora > lingora-$(date +%F).dump
```

Restore with `pg_restore -U lingora -d lingora --clean lingora-YYYY-MM-DD.dump`.
The in-app export (ZIP with JSON + Markdown profile documents) is a second, portable backup.

## Repository layout

| Folder | Contents |
|---|---|
| `backend/` | Spring Boot API, Flyway migrations, adaptive `core` logic |
| `frontend/` | React PWA, design system (`/dev/ui` component catalog) |
| `content/` | Gheg language guide, curriculum, units and exercises (JSON) |
| `e2e/` | Playwright end-to-end tests and mobile screenshots |
| `docs/` | Cross-cutting contracts (content format), content review guide, prompt templates |

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
