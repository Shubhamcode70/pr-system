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
create or replace function public.is_admin(uid uuid) returns boolean
  language sql stable as $$
    select coalesce((select is_admin from public.app_users where id = uid), false);
  $$;

-- Helper: am I an approver for this PR right now?
create or replace function public.is_current_approver(prid uuid, uid uuid) returns boolean
  language sql stable as $$
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
drop policy if exists "pr select" on public.purchase_requests;
create policy "pr select" on public.purchase_requests for select
  using (
    requester_id = auth.uid()
    or public.is_admin(auth.uid())
    or public.is_current_approver(id, auth.uid())
    -- Allow approvers/admins to also see their decision history later
    or exists (select 1 from public.pr_approvals a where a.pr_id = purchase_requests.id and a.approver_id = auth.uid())
  );
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
do $$
declare t text;
begin
  foreach t in array array['pr_line_items','pr_attachments','pr_comments']
  loop
    execute format('drop policy if exists "child select via pr" on public.%I', t);
    execute format($f$create policy "child select via pr" on public.%I for select using (
      exists (select 1 from public.purchase_requests pr where pr.id = %I.pr_id and (
        pr.requester_id = auth.uid()
        or public.is_admin(auth.uid())
        or public.is_current_approver(pr.id, auth.uid())
        or exists (select 1 from public.pr_approvals a where a.pr_id = pr.id and a.approver_id = auth.uid())
      ))
    )$f$, t, t);
    execute format('drop policy if exists "child write via pr" on public.%I', t);
    execute format($f$create policy "child write via pr" on public.%I for all using (
      exists (select 1 from public.purchase_requests pr where pr.id = %I.pr_id and (
        public.is_admin(auth.uid())
        or (pr.requester_id = auth.uid() and pr.status in ('draft','reverted'))
      ))
    ) with check (
      exists (select 1 from public.purchase_requests pr where pr.id = %I.pr_id and (
        public.is_admin(auth.uid())
        or (pr.requester_id = auth.uid() and pr.status in ('draft','reverted'))
      ))
    )$f$, t, t, t);
  end loop;
end $$;

-- ---------- pr_approvals ----------
drop policy if exists "appr select via pr" on public.pr_approvals;
create policy "appr select via pr" on public.pr_approvals for select using (
  exists (select 1 from public.purchase_requests pr where pr.id = pr_approvals.pr_id and (
    pr.requester_id = auth.uid()
    or public.is_admin(auth.uid())
    or public.is_current_approver(pr.id, auth.uid())
    or pr_approvals.approver_id = auth.uid()
  ))
);
drop policy if exists "appr insert by approver" on public.pr_approvals;
create policy "appr insert by approver" on public.pr_approvals for insert
  with check (approver_id = auth.uid() and public.is_current_approver(pr_id, auth.uid()));

-- ---------- audit_log: append only; read by admin or actor ----------
drop policy if exists "audit read admin or self" on public.audit_log;
create policy "audit read admin or self" on public.audit_log for select using (
  public.is_admin(auth.uid()) or actor_id = auth.uid()
);
-- (no insert policy here — only the trigger via security definer inserts)
