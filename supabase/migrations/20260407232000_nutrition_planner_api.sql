create extension if not exists pgcrypto;

create table if not exists public.planner_installations (
  installation_id text primary key,
  profile_id text,
  profile jsonb,
  current_plan_id text,
  current_plan jsonb,
  current_validation jsonb,
  current_plan_source text,
  last_action text,
  last_request_meta jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.planner_events (
  id uuid primary key default gen_random_uuid(),
  installation_id text not null references public.planner_installations (installation_id) on delete cascade,
  action text not null check (action in ('generate', 'replan', 'validate')),
  profile_id text,
  plan_id text,
  request_payload jsonb not null,
  response_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists planner_events_installation_created_idx
  on public.planner_events (installation_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists planner_installations_set_updated_at on public.planner_installations;

create trigger planner_installations_set_updated_at
before update on public.planner_installations
for each row
execute procedure public.set_updated_at();

alter table public.planner_installations enable row level security;
alter table public.planner_events enable row level security;

drop policy if exists "service_role_only_planner_installations" on public.planner_installations;
create policy "service_role_only_planner_installations"
on public.planner_installations
for all
using (false)
with check (false);

drop policy if exists "service_role_only_planner_events" on public.planner_events;
create policy "service_role_only_planner_events"
on public.planner_events
for all
using (false)
with check (false);
