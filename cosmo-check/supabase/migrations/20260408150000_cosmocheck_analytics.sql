create table if not exists public.cosmo_analysis_analytics (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  mode text not null check (mode in ('photo', 'manual', 'demo')),
  overall_verdict text not null check (overall_verdict in ('good', 'caution', 'bad')),
  source_count integer not null default 0,
  conflict_count integer not null default 0,
  caution_count integer not null default 0,
  synergy_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cosmo_analysis_analytics_created_idx
  on public.cosmo_analysis_analytics (created_at desc);

create index if not exists cosmo_analysis_analytics_mode_idx
  on public.cosmo_analysis_analytics (mode, created_at desc);

alter table public.cosmo_analysis_analytics enable row level security;

create or replace view public.cosmo_analysis_analytics_snapshot as
select
  count(*)::bigint as total_analyses,
  count(*) filter (
    where created_at >= date_trunc('day', timezone('utc', now()))
  )::bigint as analyses_today,
  count(*) filter (
    where created_at >= timezone('utc', now()) - interval '7 days'
  )::bigint as analyses_last_7_days,
  count(*) filter (where mode = 'photo')::bigint as photo_analyses,
  count(*) filter (where mode = 'manual')::bigint as manual_analyses,
  count(*) filter (where overall_verdict = 'good')::bigint as good_results,
  count(*) filter (where overall_verdict = 'caution')::bigint as caution_results,
  count(*) filter (where overall_verdict = 'bad')::bigint as bad_results,
  coalesce(avg(source_count), 0)::numeric(10,2) as avg_source_count,
  max(created_at) as last_analysis_at
from public.cosmo_analysis_analytics;
