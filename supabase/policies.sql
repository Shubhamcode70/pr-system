-- =====================================================================
-- Row-Level Security policies. Run AFTER schema.sql.
-- =====================================================================

-- Enable RLS on everything
alter table public.app_users enable row level security;
alter table public.role_groups enable row level security;
alter table public.role_group_members enable row level security;
alter table public.approval_rules enable row level security;
alter table public.uom_master enable row level security;
alter table public.material_group_master enable row level security;
alter table public.plant_master enable row level security;
alter table public.purchasing_group_master enable row level security;
alter table public.cost_centre_master enable row level security;
alter table public.gl_account_master enable row level security;
alter table public.capex_request_master enable row level security;
alter table public.asset_master enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.pr_line_items enable row level security;
alter table public.pr_attachments enable row level security;
alter table public.pr_approvals enable row level security;
alter table public.pr_comments enable row level security;
alter table public.audit_log enable row level security;

-- Helper: am I an admin?
-- SECURITY DEFINER so this query bypasses RLS on app_users
-- (otherwise the app_users RLS would call is_admin again -> infinite recursion)
create or replace function public.is_admin(uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select coalesce((select is_admin from public.app_users where id = uid), false);
  $$;

-- Helper: am I an approver for this PR right now?
-- SECURITY DEFINER so this query bypasses RLS on purchase_requests
-- (otherwise the purchase_requests RLS would call is_current_approver again -> infinite recursion)
create or replace function public.is_current_approver(prid uuid, uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.purchase_requests pr
      join public.approval_rules ar on ar.id = pr.approval_rule_id
      join public.role_group_members rgm on rgm.user_id = uid
      where pr.id = prid
        and pr.status in ('pending_l1','pending_l2','pending_l3','pending_l4','pending_l5')
        and case pr.current_level
          when 1 then rgm.role_group_id = ar.level_1_group_id
          when 2 then rgm.role_group_id = ar.level_2_group_id
          when 3 then rgm.role_group_id = ar.level_3_group_id
          when 4 then rgm.role_group_id = ar.level_4_group_id
          when 5 then rgm.role_group_id = ar.level_5_group_id
          else false end
    );
  $$;

-- Helper: full "can this user see this PR" check, SECURITY DEFINER to avoid
-- cross-table RLS recursion (purchase_requests <-> pr_approvals).
create or replace function public.can_view_pr(prid uuid, uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select
      exists (select 1 from public.purchase_requests where id = prid and requester_id = uid)
      or public.is_admin(uid)
      or public.is_current_approver(prid, uid)
      or exists (select 1 from public.pr_approvals where pr_id = prid and approver_id = uid);
  $$;

-- Helper: can this user write a child row (line item, attachment, comment) for this PR?
create or replace function public.can_write_pr_child(prid uuid, uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select
      public.is_admin(uid)
      or exists (select 1 from public.purchase_requests where id = prid and requester_id = uid and status in ('draft','reverted'));
  $$;

-- ---------- app_users ----------
drop policy if exists "users read self or admin" on public.app_users;
create policy "users read self or admin" on public.app_users
  for select using (id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "users update self or admin" on public.app_users;
create policy "users update self or admin" on public.app_users
  for update using (id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "admin manages users" on public.app_users;
create policy "admin manages users" on public.app_users
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------- master data (read for all logged-in; write admin only) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'role_groups','role_group_members','approval_rules',
    'uom_master','material_group_master','plant_master','purchasing_group_master',
    'cost_centre_master','gl_account_master','capex_request_master','asset_master'
  ]
  loop
    execute format('drop policy if exists "read all logged in" on public.%I', t);
    execute format('create policy "read all logged in" on public.%I for select using (auth.uid() is not null)', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))', t);
  end loop;
end $$;

-- ---------- purchase_requests ----------
-- Use SECURITY DEFINER helper to avoid recursion through pr_approvals' policy.
drop policy if exists "pr select" on public.purchase_requests;
create policy "pr select" on public.purchase_requests for select
  using (public.can_view_pr(id, auth.uid()));
drop policy if exists "pr insert own" on public.purchase_requests;
create policy "pr insert own" on public.purchase_requests for insert
  with check (requester_id = auth.uid());
drop policy if exists "pr update own draft or reverted" on public.purchase_requests;
create policy "pr update own draft or reverted" on public.purchase_requests for update
  using (
    public.is_admin(auth.uid())
    or (requester_id = auth.uid() and status in ('draft','reverted'))
    or public.is_current_approver(id, auth.uid())
  );
drop policy if exists "pr delete own draft" on public.purchase_requests;
create policy "pr delete own draft" on public.purchase_requests for delete
  using (public.is_admin(auth.uid()) or (requester_id = auth.uid() and status = 'draft'));

-- ---------- pr_line_items, pr_attachments, pr_comments — inherit from parent PR ----------
-- All using SECURITY DEFINER helpers to avoid recursion.
do $$
declare t text;
begin
  foreach t in array array['pr_line_items','pr_attachments','pr_comments']
  loop
    execute format('drop policy if exists "child select via pr" on public.%I', t);
    execute format('create policy "child select via pr" on public.%I for select using (public.can_view_pr(pr_id, auth.uid()))', t);
    execute format('drop policy if exists "child write via pr" on public.%I', t);
    execute format('create policy "child write via pr" on public.%I for all using (public.can_write_pr_child(pr_id, auth.uid())) with check (public.can_write_pr_child(pr_id, auth.uid()))', t);
  end loop;
end $$;

-- ---------- pr_approvals ----------
drop policy if exists "appr select via pr" on public.pr_approvals;
create policy "appr select via pr" on public.pr_approvals for select
  using (approver_id = auth.uid() or public.can_view_pr(pr_id, auth.uid()));
drop policy if exists "appr insert by approver" on public.pr_approvals;
create policy "appr insert by approver" on public.pr_approvals for insert
  with check (approver_id = auth.uid() and public.is_current_approver(pr_id, auth.uid()));

-- ---------- audit_log: append only; read by admin or actor ----------
drop policy if exists "audit read admin or self" on public.audit_log;
create policy "audit read admin or self" on public.audit_log for select using (
  public.is_admin(auth.uid()) or actor_id = auth.uid()
);
-- (no insert policy here — only the trigger via security definer inserts)
