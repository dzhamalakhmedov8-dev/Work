# Dialog Context

Last updated: 2026-04-07 (Europe/Moscow)

## Purpose

This file preserves the stable context of the current collaboration so we do not lose important decisions between turns.

## Working Rules

- Keep important context in Markdown files inside `notes/`.
- Update this file for stable decisions and long-lived context.
- Update `notes/WORK_LOG.md` for chronological actions and findings.

## Current Workspace State

- Workspace: `C:\Users\serge\OneDrive\Документы\New project 4`
- Git repository exists locally and is connected to GitHub:
  - `https://github.com/dzhamalakhmedov8-dev/Work.git`
- Active branch:
  - `main`
- Portable Node.js exists locally under `.tools/`.
- The repository is now a monorepo for the Nutrition Planner MVP.
- Root workspaces:
  - `apps/mobile`
  - `apps/api`
  - `packages/shared`
- Earlier Playwright scaffold files are still present, but they are no longer the main focus of the repo.

## Important Technical Context

### Nutrition Planner MVP

- Product direction:
  - mobile-first, English-first nutrition planner
  - single active local profile
  - lifestyle/fitness positioning, not a medical product
- Implemented architecture:
  - mobile app: Expo Router + React Native + TypeScript
  - local persistence: SQLite key-value store on device
  - API service: Express + TypeScript
  - optional Supabase-backed API persistence for planner snapshots and event logs
  - shared package for schemas, generation, calculation, validation, and shopping aggregation
- Core implemented capabilities:
  - onboarding for physical stats, goal, activity, meal count, exclusions, and cuisine preferences
  - deterministic calorie and macro targets from Mifflin-St Jeor + activity multiplier
  - 7-day plan generation
  - meal/day/week replanning
  - recipe ingredient grams and prep steps
  - shopping list aggregation
  - JSON export/import backup
  - plan validation through API and local app flow
- API endpoints implemented:
  - `POST /v1/plan/generate`
  - `POST /v1/plan/replan`
  - `POST /v1/plan/validate`
  - `GET /health` now also reports Supabase configuration presence
- Important package locations:
  - shared domain: `packages/shared/src/`
  - API: `apps/api/src/`
  - mobile app: `apps/mobile/`
- Current verification status:
  - root tests pass
  - root typecheck passes
  - mobile typecheck passes
  - Expo web launch was verified locally
  - Vercel production deployment succeeds from the monorepo root
  - Supabase integration code builds and tests pass without requiring keys; when keys are missing it degrades gracefully and skips remote persistence
- Main launch commands:
  - API: `npm run dev:api`
  - Mobile: `npm run dev:mobile`
  - Tests: `npm test`
  - Typecheck: `npm run typecheck`
  - Vercel build: `npm run vercel-build`
  - Deployment state:
  - Vercel project name:
    - `nutrition-planner-mobile`
  - GitHub repo is connected to the Vercel project
  - Production URL:
    - `https://nutrition-planner-mobile.vercel.app`
  - Root-level Vercel config is used so workspace dependencies like `packages/shared` are available during cloud builds
  - The production deployment now includes same-origin Vercel API routes under `/api`
  - The production deployment now also supports direct browser navigation to app routes without falling back to 404:
    - `/week`
    - `/onboarding`
    - `/profile`
    - `/settings`
    - `/shopping`
    - `/day/<id>`
    - `/meal/<id>`
  - Public health endpoint:
    - `https://nutrition-planner-mobile.vercel.app/api/health`
  - Latest direct production deployment URL:
    - `https://nutrition-planner-mobile-qaptm1ukm.vercel.app`
  - The hosted web app no longer depends on `127.0.0.1:4000` by default
- Current Vercel routing strategy:
    - `cleanUrls: true`
    - explicit rewrites for dynamic route placeholders under `/day/:dayIndex` and `/meal/:mealId`
    - catch-all SPA fallback to `/index.html` for unhandled app routes
  - Supabase integration expectations:
    - mobile public env keys:
      - `EXPO_PUBLIC_SUPABASE_URL`
      - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
    - API/private env keys:
      - `SUPABASE_URL`
      - `SUPABASE_SERVICE_ROLE_KEY`
    - API persistence is keyed by `X-Installation-Id`
    - Supabase schema lives under `supabase/migrations/`
    - local root `.env` is now configured with hosted Supabase URL plus public and service-role keys
    - Vercel production now has the required Supabase env vars configured
    - local and production API health both report Supabase as configured
    - remote schema is still missing on the hosted project because CLI migration push could not reach the remote Postgres host from this environment
    - current persistence failure reason is:
      - missing table `public.planner_installations`
- Mobile UI direction:
  - The app is being shaped as a mobile-first product rather than an internal dashboard
  - The active visual language is warm editorial nutrition planning:
    - sand backgrounds
    - elevated cream cards
    - dark green primary actions
    - warm orange emphasis
    - serif display headings with simpler body copy
  - The current UX refactor direction is:
    - step-based onboarding instead of one long form
    - compact weekly overview with explicit validation status
    - sticky mobile CTAs on day and meal drill-down screens
    - local shopping checklist progress by item and category
    - settings hidden from the primary tab bar and accessed from profile
    - inline or snackbar feedback instead of success/info alerts
  - The design-system layer now includes reusable mobile primitives for:
    - segmented controls
    - chip entry inputs
    - collapsible sections
    - sticky action bars
    - snackbars
    - validation status cards

### Playwright setup

- Local Node.js runtime exists at `.tools/node-v24.14.1-win-x64`.
- Main project files from the earlier setup:
  - `playwright.config.js`
  - `tests/example.spec.js`
  - `scripts/npm-local.cmd`
  - `scripts/playwright-local.cmd`
- Browser package download was not fully completed during setup.
- Current install command for Chromium:
  - `.\scripts\playwright-local.cmd install chromium`

### Desktop automation

- Telegram Desktop is installed at:
  - `C:\Users\serge\AppData\Roaming\Telegram Desktop\Telegram.exe`
- Telegram UI Automation was previously verified as workable in this environment.
- Steam and desktop app launching were also previously verified as workable.

### The Witcher 3

- Steam app id: `292030`
- Game path:
  - `C:\Program Files (x86)\Steam\steamapps\common\The Witcher 3`
- DX11 config was previously detected as English in:
  - `C:\Users\serge\OneDrive\Документы\The Witcher 3\user.settings`
- DX12 config was previously detected as Russian in:
  - `C:\Users\serge\OneDrive\Документы\The Witcher 3\dx12user.settings`

## Research Context

### awesome-design-md

- Reviewed repository:
  - `https://github.com/dzhamalakhmedov8-dev/awesome-design-md`
- Local analysis clone path used during review:
  - `C:\Users\serge\AppData\Local\Temp\codex-awesome-design-md`
- Main finding:
  - This repository is a curated collection of `DESIGN.md` design-system documents and HTML previews, not a code library.
- Collection size observed locally:
  - `54` site folders in `design-md/`
- Important note:
  - The content strongly resembles a fork/mirror of the VoltAgent project and still contains many VoltAgent references.

## Preference From User

- Preserve conversation context in Markdown files going forward.
- Avoid mixing unrelated local files into git commits when deploying.
- Keep the app optimized for mobile users first, even when the web export is used for sharing.
