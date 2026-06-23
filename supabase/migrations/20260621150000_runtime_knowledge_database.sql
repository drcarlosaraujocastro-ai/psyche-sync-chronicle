-- Runtime pharmacology knowledge database
-- Idempotent. Stores user-imported/curated knowledge templates in Supabase.

create extension if not exists pgcrypto;

create table if not exists public.pharmacology_knowledge_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  normalized_key text not null,
  canonical_name text not null,
  source_type text,
  confidence text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, normalized_key)
);

grant select, insert, update, delete on public.pharmacology_knowledge_templates to authenticated;
grant all on public.pharmacology_knowledge_templates to service_role;

alter table public.pharmacology_knowledge_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='pharmacology_knowledge_templates'
      and policyname='pharmacology_knowledge_templates_owner_all'
  ) then
    create policy pharmacology_knowledge_templates_owner_all
    on public.pharmacology_knowledge_templates
    for all to authenticated
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
  end if;
end $$;

create index if not exists idx_pharm_knowledge_owner_name
on public.pharmacology_knowledge_templates(owner_id, canonical_name);

create index if not exists idx_pharm_knowledge_owner_key
on public.pharmacology_knowledge_templates(owner_id, normalized_key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pharm_knowledge_updated on public.pharmacology_knowledge_templates;
create trigger trg_pharm_knowledge_updated
before update on public.pharmacology_knowledge_templates
for each row
execute function public.set_updated_at();
