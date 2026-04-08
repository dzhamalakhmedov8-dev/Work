# Nutrition Planner MVP

Mobile-first nutrition planner built with Expo, React Native, TypeScript, and a small TypeScript API.

## What it does

- collects a single user's physical stats, goal, activity, and food constraints
- generates a seven-day meal plan with calories, macros, gram-based ingredients, and recipe steps
- supports meal, day, and week replanning
- builds a consolidated shopping list
- keeps a fast local cache for profile, plans, and shopping progress
- supports Supabase Auth with email/password, Google, and Apple sign-in
- syncs one account-scoped nutrition workspace through Supabase database tables
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

The project supports optional Supabase-backed API persistence and an optional external LLM planner.

1. Copy `.env.example` to `.env`
2. Fill in:
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NUTRITION_ENABLE_LLM`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `OPENAI_BASE_URL`
   - optionally `OPENAI_REFERER` and `OPENAI_APP_NAME` when using OpenRouter
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
- Supabase Auth now uses the same public project URL and anon key for:
  - email/password sign-up and sign-in
  - Google OAuth
  - Apple OAuth
- the mobile app now syncs profile, current plan, plan history, and shopping checks into user-scoped public tables with RLS
- the API uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to upsert planner snapshots and event logs
- the planner API can call an OpenAI-compatible chat endpoint for weekly template selection when `NUTRITION_ENABLE_LLM=1`
- the deterministic planner remains the source of truth for calories, grams, shopping lists, validation, and fallback recovery
- OpenRouter keys work out of the box through the OpenAI-compatible API; the default example model is `openrouter/auto`
- if the server-side Supabase keys are missing, the planner API still works and simply skips remote persistence
- on Vercel, set the Supabase values plus the LLM values before deploying a public synced build:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NUTRITION_ENABLE_LLM`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_BASE_URL`
- production health now reports both Supabase and LLM runtime status at `/api/health`
- after adding the new user-workspace migration, the mobile client writes to:
  - `public.user_profiles`
  - `public.user_plans`
  - `public.user_sync_state`
- to use Google and Apple sign-in in a real build, also enable both providers in Supabase Auth and add redirect URLs that match this app:
  - `nutrition-planner://auth`
  - `https://nutrition-planner-mobile.vercel.app/auth`
  - `http://localhost:8081/auth`
- in Google Cloud Console and Apple Developer, the OAuth callback URL must be:
  - `https://rbsamgvfepzzakhlqdkj.supabase.co/auth/v1/callback`

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
- auth is account-based and planner state now uses a hybrid model:
  - local cache for fast reads
  - Supabase database as the shared account workspace
- the product is positioned as a lifestyle and fitness tool, not a medical app
- the web build uses browser storage, while native targets use SQLite
