# Nutrition Planner MVP

Mobile-first nutrition planner built with Expo, React Native, TypeScript, and a small TypeScript API.

## What it does

- collects a single user's physical stats, goal, activity, and food constraints
- generates a seven-day meal plan with calories, macros, gram-based ingredients, and recipe steps
- supports meal, day, and week replanning
- builds a consolidated shopping list
- stores profile and plans locally
- supports JSON backup export and import

## Workspace layout

- `apps/mobile` - Expo Router mobile app
- `apps/api` - Express API for plan generation, replanning, and validation
- `packages/shared` - shared schemas, nutrition engine, planner, validation, and tests

## Run locally

```powershell
npm run dev:api
npm run dev:mobile
```

## Supabase and tokens

The project now supports optional Supabase-backed API persistence.

1. Copy `.env.example` to `.env`
2. Fill in:
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Start the local Supabase stack and inspect the generated local keys:

```powershell
npm run supabase:start
npm run supabase:status
```

4. Apply the local Supabase schema:

```powershell
npm run supabase:db:push
```

Notes:

- the mobile app reads the public Supabase values through Expo config
- the API uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to upsert planner snapshots and event logs
- if the server-side Supabase keys are missing, the planner API still works and simply skips remote persistence
- on Vercel, set all four values before deploying a public synced build:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- the hosted Vercel project currently has no Supabase environment variables configured yet, so production still runs in graceful local-first mode until those values are added

Example Vercel commands on Windows:

```powershell
npx.cmd vercel env add EXPO_PUBLIC_SUPABASE_URL production
npx.cmd vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
npx.cmd vercel env add SUPABASE_URL production
npx.cmd vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

## Validation

```powershell
npm test
npm run typecheck
```

## Notes

- v1 is local-first and single-profile
- the product is positioned as a lifestyle and fitness tool, not a medical app
- the web build uses browser storage, while native targets use SQLite
