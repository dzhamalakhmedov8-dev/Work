create extension if not exists pgcrypto;

create table if not exists public.cosmo_analysis_history (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  mode text not null check (mode in ('photo', 'manual', 'demo')),
  overall_verdict text not null check (overall_verdict in ('good', 'caution', 'bad')),
  summary_title text not null,
  summary_copy text not null,
  product_1_name text not null,
  product_2_name text not null,
  analysis_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cosmo_analysis_history_session_created_idx
  on public.cosmo_analysis_history (session_id, created_at desc);

alter table public.cosmo_analysis_history enable row level security;
