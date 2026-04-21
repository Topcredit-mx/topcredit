# TopCredit

> Plataforma de créditos empresariales para empleados de empresas afiliadas

## Overview

TopCredit is a **company-sponsored lending platform** for employees. It includes:

- **Applicant portal** (`/cuenta`): apply for credit, upload documents, track application, and later view credits and payment history.
- **Back office** (`/equipo`): role-based queues for reviewing applications and processing disbursements.

The intended end-to-end flow is documented in `docs/app-flow-proposal.md`.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL (Neon), Drizzle ORM
- NextAuth (email OTP, TOTP, backup codes)
- Tailwind v4, shadcn/ui
- Inngest (queued jobs)
- Resend (email), Vercel (deploy)
- Biome (lint/format)
- Cypress E2E (CI records to [Sorry Cypress](https://sorry-cypress.dev/) via [cy2](https://github.com/sorry-cypress/cy2))

## Getting started

```bash
git clone <repo-url>
cd topcredit
pnpm install
cp .env.example .env   # then fill in values
pnpm db:push           # sync schema to local DB
pnpm dev
```

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (Neon) |
| `AUTH_SECRET` | NextAuth secret (e.g. `openssl rand -base64 32`) |
| `AUTH_URL` | App URL (`http://localhost:3000` in dev) |
| `EMAIL_FROM` | Sender address for Resend |
| `RESEND_API_KEY` | Resend API key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for application document storage. **Required for Cypress E2E** (document upload tests). |
| `E2E_OTP_CODE` | **Required for Cypress E2E**. Fixed 6-digit OTP; when set the app runs in E2E mode (fixed OTP, emails skipped). |
| `INNGEST_EVENT_KEY` | (Optional) [Inngest](https://www.inngest.com) event key for queuing operations (e.g. email sends in production). |

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm db:generate` | Generate migration files from schema |
| `pnpm db:migrate` | Apply migrations (use in prod) |
| `pnpm db:push` | Push schema to DB without migration files (dev only) |
| `pnpm db:nuke` | Drop public + drizzle schemas (dev only); run `db:push` after to recreate |
| `pnpm db:nuke:push` | Nuke then push — full hard reset (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm typecheck` | Run TypeScript check |
| `pnpm check` | Run Biome lint |
| `pnpm cy:open` | Open Cypress UI |
| `pnpm cy:run` | Run Cypress E2E headless (no cloud orchestration) |
| `pnpm cy:run:cloud` | Run E2E with Sorry Cypress / Director (set `CYPRESS_API_URL` and `CYPRESS_RECORD_KEY`; add `--parallel --record --ci-build-id …` in CI) |

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| Type Check | Every push | `pnpm typecheck` |
| Cypress Tests | Every push | Parallel E2E via Sorry Cypress (`cy2`), Neon branch per matrix job, then teardown |
| Prod DB | Push to `main` when `drizzle/**` or `src/server/db/schema.ts` change | Runs in `production` env: generate, fail on uncommitted migration drift, then `db:migrate`. Needs `DATABASE_URL` in production environment secrets. |

### Sorry Cypress (CI and local)

Cypress [blocks](https://github.com/cypress-io/cypress/issues/29827) the `cypress-cloud` npm package when loading `cypress.config`, so this repo uses **`cy2`** instead: it sets `CYPRESS_API_URL` and runs the real `cypress` CLI (Sorry Cypress documents this flow).

Configure these **repository secrets** (testing environment):

| Secret | Purpose |
|--------|---------|
| `CURRENTS_API_URL` | Director base URL (preferred; passed to `cy2` as `CYPRESS_API_URL`) |
| `SORRY_CYPRESS_DIRECTOR_URL` | Fallback if `CURRENTS_API_URL` is unset (same value) |
| `CYPRESS_RECORD_KEY` | Record key (must match Director `ALLOWED_KEYS` if keys are restricted) |

`projectId` in `cypress.config.ts` (`qv8a5k`) is what Sorry Cypress uses for the dashboard.

For a **local** run against Director, set `CYPRESS_API_URL` and `CYPRESS_RECORD_KEY`, then run `pnpm cy:run:cloud` (add `--parallel --record --ci-build-id <id>` to match CI).

## Project structure

```
src/
├── app/              # Routes (cuenta, equipo, settings, login, api/auth)
├── components/       # UI + feature components (incl. i18n-provider)
├── i18n/             # next-intl request config (request.ts)
├── lib/              # Shared utils, auth-utils, totp
├── messages/         # i18n: es.json (and later en.json)
├── server/           # db (schema, client), auth (config, users), mutations, queries
└── proxy.ts          # Next 16 proxy (auth redirects, route protection)
```

---

The goal is to provide accessible, transparent credit to applicants (workers at affiliated companies) while maintaining rigorous security and compliance standards.
