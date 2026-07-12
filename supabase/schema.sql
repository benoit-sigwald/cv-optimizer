-- CV Optimizer schema (applied on Supabase project "Einstein" as migrations
-- cv_optimizer_schema + cv_assets_local_path). Kept here for reference/rebuild.
-- RLS enabled with NO policies: data reachable only via owner tooling (MCP / service role).

create table if not exists cv_master (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  lang text not null default 'en',
  content jsonb not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists cv_skills_bank (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  skill text not null,
  evidence text,
  metric text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists cv_applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  location text,
  lang text not null default 'fr',
  job_spec text,
  keywords jsonb,
  hard_gates jsonb,
  positioning text,
  company_analysis text,
  ats_score_before int,
  ats_score_after int,
  cv_notes text,
  cover_letter text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cv_constraints (
  id uuid primary key default gen_random_uuid(),
  rule text not null,
  scope text not null default 'global',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists cv_assets (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  mime_type text not null,
  data_base64 text,
  local_path text,
  created_at timestamptz not null default now()
);

alter table cv_master enable row level security;
alter table cv_skills_bank enable row level security;
alter table cv_applications enable row level security;
alter table cv_constraints enable row level security;
alter table cv_assets enable row level security;
