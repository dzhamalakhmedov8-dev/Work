# Work Log

## 2026-04-05

- Added a local Playwright project scaffold in the workspace.
- Added portable Node.js under `.tools/` because system `node`/`npm` were not available in `PATH`.
- Installed `@playwright/test`.
- Added local helper scripts for running npm and Playwright from the project.
- Verified that Playwright test discovery works.
- Confirmed Chromium browser payload was still missing after installation attempts.

- Located Telegram Desktop and verified that desktop UI automation works.
- Activated Telegram and used UI Automation to interact with the open chat safely.
- Confirmed message sending flow through Telegram Desktop UI.

- Located Steam and The Witcher 3 installation.
- Launched Steam and started The Witcher 3.
- Confirmed that `witcher3.exe` and `REDlauncher` processes were running.
- Investigated why the launched game appeared in English.
- Found that DX11 localization settings were `EN`, while DX12 localization settings were `RU`.

## 2026-04-06

- Cloned and reviewed `dzhamalakhmedov8-dev/awesome-design-md`.
- Confirmed the repository is primarily a curated archive of `DESIGN.md` files plus preview pages.
- Observed 54 site folders with a standardized 4-file layout:
  - `DESIGN.md`
  - `README.md`
  - `preview.html`
  - `preview-dark.html`
- Verified that most files follow a consistent 9-section design-system template.
- Noted that the repository content still references VoltAgent extensively.
- Restructured the repo into a workspace-based monorepo for the Nutrition Planner MVP.
- Added a shared domain package with:
  - profile and plan schemas
  - deterministic nutrition target calculation
  - meal template catalog
  - weekly planner
  - replanning logic
  - plan validation
  - shopping list aggregation
- Added shared tests covering:
  - calorie and macro calculation
  - allergy/dislike enforcement
  - meal replanning
  - shopping list aggregation
- Added a TypeScript Express API with endpoints:
  - `POST /v1/plan/generate`
  - `POST /v1/plan/replan`
  - `POST /v1/plan/validate`
- Added API integration tests with `supertest`.
- Replaced the Expo sample app with a Nutrition Planner mobile app that now includes:
  - onboarding
  - week tab
  - shopping tab
  - profile tab
  - settings tab
  - day detail screen
  - meal detail screen
  - replan modal
- Added SQLite-backed local persistence for:
  - profile
  - current plan
  - plan history
  - installation id
  - API base URL setting
- Added JSON backup export/import via document picker + file sharing.
- Verified:
  - `npm test`
  - `npm run typecheck`
- Did not launch the Expo app on a simulator/device during this turn, so runtime UI behavior is not manually smoke-tested yet.
- Pushed the project to GitHub:
  - `https://github.com/dzhamalakhmedov8-dev/Work.git`
- Authenticated the Vercel CLI and created project:
  - `nutrition-planner-mobile`
- Connected the Vercel project to the GitHub repository.
- Investigated the first Vercel build failure and found the cause:
  - Vercel was building only `apps/mobile`, so the workspace dependency on `packages/shared` was missing
- Added a root-level Vercel config plus a root `vercel-build` script for monorepo-aware deployment.
- Verified a successful production deployment on Vercel:
  - `https://nutrition-planner-mobile.vercel.app`

## Next Update Rule

- Add a new bullet here whenever an important task is completed or a meaningful finding changes future work.
