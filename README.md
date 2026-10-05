# Lingora

Adaptive learning app for German speakers learning **Gheg Albanian** (Kosovo-Gheg): placement test,
personal learning plan up to C2, dynamically composed lessons, FSRS-6 reviews, streaks and XP.
Single-user instance for your own server. Product requirements: [`PRD.md`](PRD.md).

## Quick start (local development)

Requirements: JDK 21+ (Gradle provisions JDK 25 automatically), Node 24, Docker.

```bash
docker compose up -d db                 # PostgreSQL 18 on localhost:5433
cd backend && ./gradlew bootRun         # API on http://localhost:8080 (Windows: gradlew.bat)
cd frontend && npm install && npm run dev   # app on http://localhost:5173
```

On this Windows machine the JDK cannot open its loopback socket in the default temp folder; run Gradle
with a project-local temp dir (PowerShell: `$env:TEMP=$env:TMP='C:\dev\lingora\.tmp'`).

Open http://localhost:5173, create your account (first start only) and start learning.
The production build (`npm run build`) is an installable PWA; hosting it behind a TLS reverse proxy
is not part of M0–M6 (see `QUESTIONS.md`).
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
| `docs/` | Cross-cutting contracts (content format) |
