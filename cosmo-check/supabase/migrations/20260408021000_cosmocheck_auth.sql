alter table public.cosmo_analysis_history
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists cosmo_analysis_history_user_created_idx
  on public.cosmo_analysis_history (user_id, created_at desc);

alter table public.cosmo_analysis_analytics
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists cosmo_analysis_analytics_user_created_idx
  on public.cosmo_analysis_analytics (user_id, created_at desc);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  auth_provider text not null default 'email',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles enable row level security;

create or replace function public.touch_user_profile_updated_at()
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
execute function public.touch_user_profile_updated_at();

create or replace function public.sync_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    auth_provider
  )
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), ''),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url),
    auth_provider = coalesce(excluded.auth_provider, public.user_profiles.auth_provider),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.sync_user_profile_from_auth();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data, raw_app_meta_data on auth.users
for each row
execute function public.sync_user_profile_from_auth();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on public.user_profiles
      for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.user_profiles
      for insert
      to authenticated
      with check ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.user_profiles
      for update
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;
end
$$;
