# CosmoCheck

Consumer-версия `CosmoCheck` для сравнения двух средств по составу или по фото с авторизацией через `Supabase Auth`, историей рекомендаций в `Supabase` и server-side фото-разбором через `OpenRouter`.

## Что уже работает

- ручное сравнение двух составов
- сравнение по фото после входа в аккаунт
- вход через `Google` и `email/password`
- сохранение рекомендаций в истории аккаунта
- server-side API на `Vercel Functions`
- smoke-проверки для локального и production окружения

## Важные ограничения

- `Apple Sign In` пока не выводится в интерфейсе и не должен включаться без реальных Apple credentials
- история рекомендаций хранится только для авторизованного пользователя
- незавершённые пары до входа сохраняются только как временный draft в браузере

## Обязательные переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните значения:

```powershell
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=replace-with-your-supabase-publishable-key
SUPABASE_SECRET_KEY=replace-with-your-supabase-secret-key
OPENROUTER_API_KEY=replace-with-your-openrouter-api-key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_APP_NAME=CosmoCheck
OPENROUTER_SITE_URL=https://cosmo-check.vercel.app
COSMO_CHECK_APP_URL=https://cosmo-check.vercel.app
```

## Локальная проверка

Из папки `cosmo-check`:

```powershell
npm install
npm run check:env
npx.cmd playwright install chromium
npm run test:e2e
npm run smoke:prod
```

Для локального runtime используйте именно `vercel dev`:

```powershell
npx.cmd vercel dev
```

## Проверки

- `npm run check:env` — проверка обязательных env и доступности Supabase auth settings
- `npm run typecheck` — проверка serverless TypeScript
- `npm run test:e2e` — локальный smoke-suite через Playwright
- `npm run smoke:prod` — безопасный production smoke для [cosmo-check.vercel.app](https://cosmo-check.vercel.app/)
- `npm run smoke:photo-api` — живой production smoke именно для OCR/photo-analysis

## Supabase

Миграции лежат в `supabase/migrations`.

Если проект уже привязан через CLI:

```powershell
supabase db push
```

Новая серверная история работает только для пользователя после входа. Гостевые server-backed записи больше не используются.

## Vercel

Актуальный production URL:

- [https://cosmo-check.vercel.app/](https://cosmo-check.vercel.app/)

Добавьте env в Vercel project `cosmo-check`:

```powershell
npx.cmd vercel env add SUPABASE_URL production
npx.cmd vercel env add SUPABASE_PUBLISHABLE_KEY production
npx.cmd vercel env add SUPABASE_SECRET_KEY production
npx.cmd vercel env add OPENROUTER_API_KEY production
npx.cmd vercel env add OPENROUTER_MODEL production
npx.cmd vercel env add OPENROUTER_APP_NAME production
npx.cmd vercel env add OPENROUTER_SITE_URL production
```

## Операционная безопасность

- не используйте `.vercel/.env.*` как рабочее место хранения секретов
- секреты должны жить только в `Vercel env` и локальном `.env.local`
- legacy `anon/service_role` лучше заменить на `publishable/secret` и затем удалить из `Vercel env`
- ранее засвеченный `OPENROUTER_API_KEY` всё ещё нужно ротировать отдельно на стороне провайдера
