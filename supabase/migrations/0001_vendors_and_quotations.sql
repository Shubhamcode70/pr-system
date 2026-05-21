-- =====================================================================
-- Phase 2 — Milestone 2A: Vendor Master + Multi-Vendor Quotations
-- Additive only — does not touch Phase 1 tables.
-- =====================================================================

-- ---------- Vendors ----------
create sequence if not exists vendor_code_seq;

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text unique not null default ('VEND-' || lpad(nextval('vendor_code_seq')::text, 5, '0')),
  legal_name text not null,
  trade_name text,
  gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
  pan text check (pan is null or pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
  msme_registered boolean not null default false,
  msme_certificate_path text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text check (pincode is null or pincode ~ '^[0-9]{6}$'),
  country text not null default 'India',
  contact_name text,
  contact_email text check (contact_email is null or contact_email ~ '^[^@]+@[^@]+\.[^@]+$'),
  contact_phone text,
  bank_name text,
  account_no text,
  ifsc text check (ifsc is null or ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  payment_terms text not null default 'Net 30',
  currency text not null default 'INR',
  status text not null default 'draft' check (status in ('draft','active','on_hold','blacklisted')),
  onboarded_by uuid references public.app_users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vendors_status on public.vendors(status);
create index if not exists idx_vendors_legal_name on public.vendors using gin (to_tsvector('english', legal_name));

-- ---------- PR Quotations ----------
create table if not exists public.pr_quotations (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid not null references public.purchase_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  quote_reference text,
  quote_date date,
  validity_date date,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  currency text not null default 'INR',
  payment_terms_offered text,
  delivery_lead_time_days smallint,
  attachment_id uuid references public.pr_attachments(id) on delete set null,
  notes text,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_pr_quotations_pr on public.pr_quotations(pr_id);
-- Exactly one selected quotation per PR
create unique index if not exists uniq_pr_quotations_selected on public.pr_quotations(pr_id) where is_selected = true;

-- ---------- Auto-sync single_vendor_flag based on quotation count ----------
-- IMPORTANT: never auto-SET to true without a justification, because the existing
-- CHECK constraint on purchase_requests blocks that combination. Safer semantics:
--   * >= 2 quotes  -> clear the flag (definitely not single-vendor)
--   * exactly 1 quote AND justification already present -> set the flag
--   * otherwise -> leave the flag unchanged (UI prompts requester to set + justify)
create or replace function public.sync_single_vendor_flag() returns trigger as $$
declare
  v_pr uuid := coalesce(new.pr_id, old.pr_id);
  v_count int;
  v_has_justification boolean;
begin
  select count(*) into v_count from public.pr_quotations where pr_id = v_pr;
  select (single_vendor_justification is not null and length(trim(single_vendor_justification)) > 0)
    into v_has_justification
    from public.purchase_requests where id = v_pr;

  update public.purchase_requests
    set single_vendor_flag = case
      when v_count >= 2 then false
      when v_count = 1 and v_has_justification then true
      else single_vendor_flag
    end
    where id = v_pr and status in ('draft','reverted');
  return null;
end; $$ language plpgsql;

drop trigger if exists trg_sync_single_vendor on public.pr_quotations;
create trigger trg_sync_single_vendor after insert or update or delete on public.pr_quotations
  for each row execute function public.sync_single_vendor_flag();

-- ---------- Audit log ----------
drop trigger if exists trg_audit_vendors on public.vendors;
create trigger trg_audit_vendors after insert or update or delete on public.vendors
  for each row execute function public.audit_row_trigger();

drop trigger if exists trg_audit_pr_quotations on public.pr_quotations;
create trigger trg_audit_pr_quotations after insert or update or delete on public.pr_quotations
  for each row execute function public.audit_row_trigger();

-- ---------- RLS ----------
alter table public.vendors enable row level security;
alter table public.pr_quotations enable row level security;

-- Vendors: any logged-in user can READ (so PR forms can pick); admin manages
drop policy if exists "vendors read" on public.vendors;
create policy "vendors read" on public.vendors for select using (auth.uid() is not null);

drop policy if exists "vendors admin write" on public.vendors;
create policy "vendors admin write" on public.vendors for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "vendors self-onboard draft" on public.vendors;
create policy "vendors self-onboard draft" on public.vendors for insert
  with check (onboarded_by = auth.uid() and status = 'draft');

drop policy if exists "vendors own-draft update" on public.vendors;
create policy "vendors own-draft update" on public.vendors for update
  using (onboarded_by = auth.uid() and status = 'draft')
  with check (onboarded_by = auth.uid() and status = 'draft');

-- pr_quotations inherit visibility/write from parent PR via SECURITY DEFINER helpers
drop policy if exists "pr_quotations select via pr" on public.pr_quotations;
create policy "pr_quotations select via pr" on public.pr_quotations for select
  using (public.can_view_pr(pr_id, auth.uid()));

drop policy if exists "pr_quotations write via pr" on public.pr_quotations;
create policy "pr_quotations write via pr" on public.pr_quotations for all
  using (public.can_write_pr_child(pr_id, auth.uid()))
  with check (public.can_write_pr_child(pr_id, auth.uid()));

-- ---------- Updated-at trigger ----------
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_touch_vendors on public.vendors;
create trigger trg_touch_vendors before update on public.vendors
  for each row execute function public.touch_updated_at();
