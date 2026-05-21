-- =====================================================================
-- Storage bucket for PR attachments.
-- Run this AFTER policies.sql.
-- Note: you can also create the bucket from the Supabase Dashboard
-- (Storage → New bucket → name: pr-attachments → Private).
-- =====================================================================

insert into storage.buckets (id, name, public) values ('pr-attachments','pr-attachments', false)
on conflict (id) do nothing;

-- Allow logged-in users to upload to their own PR folder
drop policy if exists "att upload" on storage.objects;
create policy "att upload" on storage.objects for insert
  with check (
    bucket_id = 'pr-attachments'
    and auth.uid() is not null
  );

-- Allow read of attachments only if the requester can read the parent PR
drop policy if exists "att read" on storage.objects;
create policy "att read" on storage.objects for select
  using (
    bucket_id = 'pr-attachments'
    and exists (
      select 1 from public.pr_attachments a
      join public.purchase_requests pr on pr.id = a.pr_id
      where a.storage_path = storage.objects.name
        and (
          pr.requester_id = auth.uid()
          or public.is_admin(auth.uid())
          or public.is_current_approver(pr.id, auth.uid())
          or exists (select 1 from public.pr_approvals aa where aa.pr_id = pr.id and aa.approver_id = auth.uid())
        )
    )
  );

-- Allow requester or admin to delete attachments they uploaded (for draft/reverted PRs only)
drop policy if exists "att delete" on storage.objects;
create policy "att delete" on storage.objects for delete
  using (
    bucket_id = 'pr-attachments'
    and exists (
      select 1 from public.pr_attachments a
      join public.purchase_requests pr on pr.id = a.pr_id
      where a.storage_path = storage.objects.name
        and (public.is_admin(auth.uid()) or (pr.requester_id = auth.uid() and pr.status in ('draft','reverted')))
    )
  );
