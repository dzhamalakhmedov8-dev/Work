# Dialog Context

Last updated: 2026-04-06 (Europe/Moscow)

## Purpose

This file preserves the stable context of the current collaboration so we do not lose important decisions between turns.

## Working Rules

- Keep important context in Markdown files inside `notes/`.
- Update this file for stable decisions and long-lived context.
- Update `notes/WORK_LOG.md` for chronological actions and findings.

## Current Workspace State

- Workspace: `C:\Users\serge\OneDrive\Документы\New project 4`
- Git repository exists but changes are not committed yet.
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
- Important package locations:
  - shared domain: `packages/shared/src/`
  - API: `apps/api/src/`
  - mobile app: `apps/mobile/`
- Current verification status:
  - root tests pass
  - root typecheck passes
  - mobile typecheck passes
  - Expo runtime was not launched in this turn, so mobile UI is verified by implementation and static checks rather than manual device execution
- Main launch commands:
  - API: `npm run dev:api`
  - Mobile: `npm run dev:mobile`
  - Tests: `npm test`
  - Typecheck: `npm run typecheck`

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
