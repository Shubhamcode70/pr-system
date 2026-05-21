-- =====================================================================
-- Tracker module: read-only view of PRs imported from SAP via Excel upload.
-- Run AFTER schema.sql, policies.sql, seed.sql, storage.sql.
-- =====================================================================

create table if not exists public.sap_import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  uploaded_by uuid references public.app_users(id),
  uploaded_at timestamptz not null default now(),
  status text not null default 'active', -- active | superseded
  row_counts jsonb default '{}'::jsonb
);

create table if not exists public.sap_pr_pending (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.sap_import_batches(id) on delete cascade,
  pr_no text not null,
  raw_row jsonb not null,                 -- entire row from the Excel sheet as JSON (for flexibility)
  plant text,
  username text,
  requisitioner text,
  total_pr_value text,
  uom text,
  request_date date,
  final_release_date date
);
create index if not exists idx_sap_pending_pr on public.sap_pr_pending(batch_id, pr_no);

create table if not exists public.sap_pr_cost_centre (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.sap_import_batches(id) on delete cascade,
  pr_no text not null,
  cost_centre text,
  purchasing_group_desc text,
  po_number text,
  po_date date,
  raw_row jsonb not null
);
create index if not exists idx_sap_cc_pr on public.sap_pr_cost_centre(batch_id, pr_no);

create table if not exists public.sap_approval_matrix (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.sap_import_batches(id) on delete cascade,
  cost_centre text not null,
  description text,
  business text,
  location text,
  function text,
  person text,
  -- 9 SAP levels A..I — store as JSON for flexibility
  levels jsonb not null default '{}'::jsonb
);
create index if not exists idx_sap_matrix_cc on public.sap_approval_matrix(batch_id, cost_centre);

-- ---------- RLS ----------
alter table public.sap_import_batches enable row level security;
alter table public.sap_pr_pending enable row level security;
alter table public.sap_pr_cost_centre enable row level security;
alter table public.sap_approval_matrix enable row level security;

-- All logged-in users can read; only admins write (uploads)
do $$
declare t text;
begin
  foreach t in array array['sap_import_batches','sap_pr_pending','sap_pr_cost_centre','sap_approval_matrix']
  loop
    execute format('drop policy if exists "tracker read" on public.%I', t);
    execute format('create policy "tracker read" on public.%I for select using (auth.uid() is not null)', t);
    execute format('drop policy if exists "tracker admin write" on public.%I', t);
    execute format('create policy "tracker admin write" on public.%I for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))', t);
  end loop;
end $$;
