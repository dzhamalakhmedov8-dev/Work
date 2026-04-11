create table if not exists public.cosmo_rate_limits (
  scope_key text primary key,
  bucket text not null,
  hits integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cosmo_rate_limits_bucket_expires_idx
  on public.cosmo_rate_limits (bucket, expires_at desc);

alter table public.cosmo_rate_limits enable row level security;
