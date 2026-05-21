-- =====================================================================
-- PR System — Phase 1 Schema
-- Run this in the Supabase SQL Editor (one shot).
-- Requires the built-in `auth.users` table (provided by Supabase Auth).
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ---------- App users (extends auth.users) ----------
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Role groups (dynamic approver groups) ----------
create table if not exists public.role_groups (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.role_group_members (
  role_group_id uuid not null references public.role_groups(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  primary key (role_group_id, user_id)
);

-- ---------- Approval rules (amount based, up to 5 levels) ----------
create table if not exists public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  min_amount numeric(14,2) not null default 0,
  max_amount numeric(14,2),  -- null = unbounded
  level_1_group_id uuid not null references public.role_groups(id),
  level_2_group_id uuid references public.role_groups(id),
  level_3_group_id uuid references public.role_groups(id),
  level_4_group_id uuid references public.role_groups(id),
  level_5_group_id uuid references public.role_groups(id),
  resubmit_strategy text not null default 'restart' check (resubmit_strategy in ('restart','resume')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (max_amount is null or max_amount > min_amount)
);

-- ---------- Master data ----------
create table if not exists public.uom_master (
  code text primary key,
  description text not null,
  is_active boolean not null default true
);
create table if not exists public.material_group_master (
  code text primary key,
  name text not null,
  is_active boolean not null default true
);
create table if not exists public.plant_master (
  code text primary key,
  name text not null,
  is_active boolean not null default true
);
create table if not exists public.purchasing_group_master (
  code text primary key,
  name text not null,
  is_active boolean not null default true
);
create table if not exists public.cost_centre_master (
  code text primary key,
  name text not null,
  is_active boolean not null default true
);
create table if not exists public.gl_account_master (
  code text primary key,
  name text not null,
  expense_type text not null check (expense_type in ('CAPEX','OPEX')),
  is_active boolean not null default true
);
create table if not exists public.capex_request_master (
  cr_id text primary key,
  title text not null,
  budget_amount numeric(14,2) not null default 0,
  is_active boolean not null default true
);
create table if not exists public.asset_master (
  asset_no text primary key,
  description text not null,
  cr_id text references public.capex_request_master(cr_id),
  is_active boolean not null default true
);

-- ---------- Purchase Requests (header) ----------
create type pr_status as enum (
  'draft','submitted','pending_l1','pending_l2','pending_l3','pending_l4','pending_l5',
  'reverted','approved','rejected','withdrawn'
);
create type pr_type_enum as enum ('CAPEX','OPEX');

create sequence if not exists pr_number_seq;

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  pr_number text unique not null default ('PR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('pr_number_seq')::text, 5, '0')),
  requester_id uuid not null references public.app_users(id),
  requirement_received_from text not null,
  department text not null,
  location text not null,
  purpose_of_procurement text not null,
  pr_type pr_type_enum not null,
  cr_id text references public.capex_request_master(cr_id),
  asset_number text references public.asset_master(asset_no),
  single_vendor_flag boolean not null default false,
  single_vendor_justification text,
  preferred_vendor_name text,
  currency text not null default 'INR',
  total_value numeric(14,2) not null default 0,
  status pr_status not null default 'draft',
  current_level smallint,
  approval_rule_id uuid references public.approval_rules(id),
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Conditional CAPEX rule
  check (pr_type = 'OPEX' or (cr_id is not null and asset_number is not null)),
  -- Single vendor needs justification
  check (single_vendor_flag = false or (single_vendor_justification is not null and length(trim(single_vendor_justification)) > 0))
);
create index if not exists idx_pr_requester on public.purchase_requests(requester_id);
create index if not exists idx_pr_status on public.purchase_requests(status);
create index if not exists idx_pr_current_level on public.purchase_requests(current_level);

-- ---------- Line items ----------
create table if not exists public.pr_line_items (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid not null references public.purchase_requests(id) on delete cascade,
  item_no smallint not null,
  short_text text not null,
  uom text not null references public.uom_master(code),
  quantity numeric(12,3) not null check (quantity > 0),
  valuation_price numeric(14,2) not null check (valuation_price >= 0),
  total_value numeric(14,2) generated always as (quantity * valuation_price) stored,
  delivery_date date not null,
  material_group text not null references public.material_group_master(code),
  plant_code text not null references public.plant_master(code),
  purchasing_group text not null references public.purchasing_group_master(code),
  requisitioner_name text not null,
  acct_assignment_qty numeric(12,3) not null,
  cost_centre text not null references public.cost_centre_master(code),
  gl_account text not null references public.gl_account_master(code),
  cost_bearer text not null references public.cost_centre_master(code),
  check (item_no between 1 and 100),
  unique (pr_id, item_no)
);
create index if not exists idx_line_pr on public.pr_line_items(pr_id);

-- ---------- Attachments ----------
create table if not exists public.pr_attachments (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid not null references public.purchase_requests(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes <= 10 * 1024 * 1024),
  uploaded_by uuid not null references public.app_users(id),
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_att_pr on public.pr_attachments(pr_id);

-- Enforce max 5 attachments per PR
create or replace function enforce_max_attachments() returns trigger as $$
begin
  if (select count(*) from public.pr_attachments where pr_id = new.pr_id) >= 5 then
    raise exception 'A PR can have at most 5 attachments';
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_max_att on public.pr_attachments;
create trigger trg_max_att before insert on public.pr_attachments
  for each row execute function enforce_max_attachments();

-- ---------- Approvals ----------
create type approval_decision as enum ('approve','reject','revert');

create table if not exists public.pr_approvals (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid not null references public.purchase_requests(id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  approver_id uuid not null references public.app_users(id),
  decision approval_decision not null,
  comment text,
  decided_at timestamptz not null default now(),
  check (decision = 'approve' or (comment is not null and length(trim(comment)) > 0))
);
create index if not exists idx_appr_pr on public.pr_approvals(pr_id);

-- ---------- Comments ----------
create table if not exists public.pr_comments (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid not null references public.purchase_requests(id) on delete cascade,
  author_id uuid not null references public.app_users(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- Audit log ----------
create table if not exists public.audit_log (
  id bigserial primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_id uuid references public.app_users(id),
  before_jsonb jsonb,
  after_jsonb jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on public.audit_log(entity_type, entity_id);
create index if not exists idx_audit_created on public.audit_log(created_at desc);

-- ---------- Generic audit trigger (records before/after for key tables) ----------
create or replace function audit_row_trigger() returns trigger as $$
declare
  v_actor uuid := null;
begin
  begin
    v_actor := auth.uid();
  exception when others then v_actor := null;
  end;

  if tg_op = 'INSERT' then
    insert into public.audit_log(entity_type, entity_id, action, actor_id, after_jsonb)
    values (tg_table_name, (new.id)::text, 'create', v_actor, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log(entity_type, entity_id, action, actor_id, before_jsonb, after_jsonb)
    values (tg_table_name, (new.id)::text, 'update', v_actor, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log(entity_type, entity_id, action, actor_id, before_jsonb)
    values (tg_table_name, (old.id)::text, 'delete', v_actor, to_jsonb(old));
    return old;
  end if;
  return null;
end; $$ language plpgsql security definer;

drop trigger if exists trg_audit_pr on public.purchase_requests;
create trigger trg_audit_pr after insert or update or delete on public.purchase_requests
  for each row execute function audit_row_trigger();

drop trigger if exists trg_audit_lines on public.pr_line_items;
create trigger trg_audit_lines after insert or update or delete on public.pr_line_items
  for each row execute function audit_row_trigger();

drop trigger if exists trg_audit_approvals on public.pr_approvals;
create trigger trg_audit_approvals after insert on public.pr_approvals
  for each row execute function audit_row_trigger();

-- ---------- Total value sync ----------
create or replace function sync_pr_total() returns trigger as $$
declare v_pr uuid;
begin
  v_pr := coalesce(new.pr_id, old.pr_id);
  update public.purchase_requests
    set total_value = coalesce((select sum(total_value) from public.pr_line_items where pr_id = v_pr), 0),
        updated_at = now()
    where id = v_pr;
  return null;
end; $$ language plpgsql;

drop trigger if exists trg_sync_total on public.pr_line_items;
create trigger trg_sync_total after insert or update or delete on public.pr_line_items
  for each row execute function sync_pr_total();

-- ---------- Auto-create app_users row when an auth user is created ----------
create or replace function handle_new_auth_user() returns trigger as $$
begin
  insert into public.app_users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists trg_new_auth_user on auth.users;
create trigger trg_new_auth_user after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------- Helper view: pending PRs by approver (used by approval queue) ----------
create or replace view public.v_my_queue as
  select pr.*
  from public.purchase_requests pr
  join public.approval_rules ar on ar.id = pr.approval_rule_id
  join public.role_group_members rgm on rgm.user_id = auth.uid()
  where pr.status in ('pending_l1','pending_l2','pending_l3','pending_l4','pending_l5')
    and case pr.current_level
      when 1 then rgm.role_group_id = ar.level_1_group_id
      when 2 then rgm.role_group_id = ar.level_2_group_id
      when 3 then rgm.role_group_id = ar.level_3_group_id
      when 4 then rgm.role_group_id = ar.level_4_group_id
      when 5 then rgm.role_group_id = ar.level_5_group_id
      else false
    end;
