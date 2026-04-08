create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  plan jsonb not null,
  validation jsonb not null,
  source text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_sync_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shopping_checks jsonb not null default '{}'::jsonb,
  last_installation_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_plans_user_plan_unique_idx
  on public.user_plans (user_id, plan_id);

create unique index if not exists user_plans_one_current_per_user_idx
  on public.user_plans (user_id)
  where is_current = true;

create index if not exists user_plans_user_created_idx
  on public.user_plans (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists user_plans_set_updated_at on public.user_plans;
create trigger user_plans_set_updated_at
before update on public.user_plans
for each row
execute procedure public.set_updated_at();

drop trigger if exists user_sync_state_set_updated_at on public.user_sync_state;
create trigger user_sync_state_set_updated_at
before update on public.user_sync_state
for each row
execute procedure public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.user_plans enable row level security;
alter table public.user_sync_state enable row level security;

grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.user_plans to authenticated;
grant select, insert, update, delete on public.user_sync_state to authenticated;

grant all on public.user_profiles to service_role;
grant all on public.user_plans to service_role;
grant all on public.user_sync_state to service_role;

drop policy if exists "users_manage_own_profile" on public.user_profiles;
create policy "users_manage_own_profile"
on public.user_profiles
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users_manage_own_plans" on public.user_plans;
create policy "users_manage_own_plans"
on public.user_plans
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users_manage_own_sync_state" on public.user_sync_state;
create policy "users_manage_own_sync_state"
on public.user_sync_state
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
