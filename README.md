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

## Validation

```powershell
npm test
npm run typecheck
```

## Notes

- v1 is local-first and single-profile
- the product is positioned as a lifestyle and fitness tool, not a medical app
- the web build uses browser storage, while native targets use SQLite
