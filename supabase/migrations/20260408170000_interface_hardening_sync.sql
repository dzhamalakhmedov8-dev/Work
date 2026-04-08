create table if not exists public.user_shopping_checks (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  ingredient_id text not null,
  checked boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, plan_id, ingredient_id)
);

create index if not exists user_shopping_checks_user_plan_idx
  on public.user_shopping_checks (user_id, plan_id, updated_at desc);

alter table public.user_shopping_checks enable row level security;

grant select, insert, update, delete on public.user_shopping_checks to authenticated;
grant all on public.user_shopping_checks to service_role;

drop policy if exists "users_manage_own_shopping_checks" on public.user_shopping_checks;
create policy "users_manage_own_shopping_checks"
on public.user_shopping_checks
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.require_auth_uid()
returns uuid
language plpgsql
stable
as $$
declare
  current_uid uuid;
begin
  current_uid := auth.uid();

  if current_uid is null then
    raise exception 'auth_required';
  end if;

  return current_uid;
end;
$$;

create or replace function public.upsert_user_profile(profile jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.require_auth_uid();
begin
  insert into public.user_profiles (user_id, profile)
  values (current_uid, profile)
  on conflict (user_id) do update
  set profile = excluded.profile,
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.replace_user_current_plan(
  plan jsonb,
  validation jsonb,
  source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.require_auth_uid();
  next_plan_id text := trim(coalesce(plan->>'id', ''));
begin
  if next_plan_id = '' then
    raise exception 'plan_id_required';
  end if;

  update public.user_plans
  set is_current = false,
      updated_at = timezone('utc', now())
  where user_id = current_uid
    and is_current = true
    and plan_id <> next_plan_id;

  insert into public.user_plans (
    user_id,
    plan_id,
    plan,
    validation,
    source,
    is_current
  )
  values (
    current_uid,
    next_plan_id,
    plan,
    validation,
    source,
    true
  )
  on conflict (user_id, plan_id) do update
  set plan = excluded.plan,
      validation = excluded.validation,
      source = excluded.source,
      is_current = true,
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.upsert_user_plan_history(plans jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.require_auth_uid();
  next_ids text[];
begin
  next_ids := coalesce(
    array(
      select trim(coalesce(item->>'id', ''))
      from jsonb_array_elements(coalesce(plans, '[]'::jsonb)) as item
      where trim(coalesce(item->>'id', '')) <> ''
    ),
    array[]::text[]
  );

  delete from public.user_plans
  where user_id = current_uid
    and is_current = false
    and (
      cardinality(next_ids) = 0
      or plan_id <> all(next_ids)
    );

  insert into public.user_plans (
    user_id,
    plan_id,
    plan,
    validation,
    source,
    is_current
  )
  select
    current_uid,
    trim(coalesce(item->>'id', '')) as plan_id,
    item,
    coalesce(item->'validation', '{}'::jsonb),
    coalesce(item->>'source', 'template'),
    false
  from jsonb_array_elements(coalesce(plans, '[]'::jsonb)) as item
  where trim(coalesce(item->>'id', '')) <> ''
  on conflict (user_id, plan_id) do update
  set plan = excluded.plan,
      validation = excluded.validation,
      source = excluded.source,
      is_current = false,
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.set_user_shopping_check(
  plan_id text,
  ingredient_id text,
  checked boolean,
  installation_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.require_auth_uid();
begin
  if trim(coalesce(plan_id, '')) = '' or trim(coalesce(ingredient_id, '')) = '' then
    raise exception 'shopping_check_identifiers_required';
  end if;

  if checked then
    insert into public.user_shopping_checks (user_id, plan_id, ingredient_id, checked)
    values (current_uid, trim(plan_id), trim(ingredient_id), true)
    on conflict (user_id, plan_id, ingredient_id) do update
    set checked = true,
        updated_at = timezone('utc', now());
  else
    delete from public.user_shopping_checks
    where user_id = current_uid
      and plan_id = trim(plan_id)
      and ingredient_id = trim(ingredient_id);
  end if;

  insert into public.user_sync_state (user_id, shopping_checks, last_installation_id)
  values (current_uid, '{}'::jsonb, nullif(trim(coalesce(installation_id, '')), ''))
  on conflict (user_id) do update
  set last_installation_id = coalesce(
        nullif(trim(coalesce(installation_id, '')), ''),
        public.user_sync_state.last_installation_id
      ),
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.replace_user_shopping_checks(
  checks jsonb,
  installation_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.require_auth_uid();
begin
  delete from public.user_shopping_checks
  where user_id = current_uid;

  insert into public.user_shopping_checks (user_id, plan_id, ingredient_id, checked)
  select
    current_uid,
    trim(item->>'plan_id'),
    trim(item->>'ingredient_id'),
    coalesce((item->>'checked')::boolean, true)
  from jsonb_array_elements(coalesce(checks, '[]'::jsonb)) as item
  where trim(coalesce(item->>'plan_id', '')) <> ''
    and trim(coalesce(item->>'ingredient_id', '')) <> ''
    and coalesce((item->>'checked')::boolean, true) = true
  on conflict (user_id, plan_id, ingredient_id) do update
  set checked = excluded.checked,
      updated_at = timezone('utc', now());

  insert into public.user_sync_state (user_id, shopping_checks, last_installation_id)
  values (current_uid, '{}'::jsonb, nullif(trim(coalesce(installation_id, '')), ''))
  on conflict (user_id) do update
  set last_installation_id = coalesce(
        nullif(trim(coalesce(installation_id, '')), ''),
        public.user_sync_state.last_installation_id
      ),
      updated_at = timezone('utc', now());
end;
$$;

create or replace function public.clear_user_workspace()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := public.require_auth_uid();
begin
  delete from public.user_profiles where user_id = current_uid;
  delete from public.user_plans where user_id = current_uid;
  delete from public.user_shopping_checks where user_id = current_uid;
  delete from public.user_sync_state where user_id = current_uid;
end;
$$;

grant execute on function public.require_auth_uid() to authenticated, service_role;
grant execute on function public.upsert_user_profile(jsonb) to authenticated, service_role;
grant execute on function public.replace_user_current_plan(jsonb, jsonb, text) to authenticated, service_role;
grant execute on function public.upsert_user_plan_history(jsonb) to authenticated, service_role;
grant execute on function public.set_user_shopping_check(text, text, boolean, text) to authenticated, service_role;
grant execute on function public.replace_user_shopping_checks(jsonb, text) to authenticated, service_role;
grant execute on function public.clear_user_workspace() to authenticated, service_role;
