# Debug Runbook

Common symptoms with diagnosis paths.

## "infinite recursion detected in policy for relation X"

A SELECT policy on table A is calling something that triggers a SELECT on table B, whose policy triggers a SELECT on table A.

**Fix:** wrap the cross-table check in a `SECURITY DEFINER` SQL function so RLS does not recurse.

```sql
create or replace function public.can_view_X(...) returns boolean
  language sql stable security definer set search_path = public as $$
    select ...
  $$;
```

Then replace the inline `EXISTS` clause in the policy with a call to the helper.

## "violates foreign key constraint pr_line_items_X_fkey"

The line is referencing a master code that no longer exists or was typed wrong.

**Fix paths:**
- Confirm dropdown was used (not a typed value)
- Check `is_active = true` on the master row
- Make sure pre-submit client validation catches empty `""` values

## "Submission appears to create multiple PRs"

Race condition from rapid button clicks before React state updates.

**Fix:** `useRef` guard:
```ts
const submittingRef = useRef(false);
async function submit() {
  if (submittingRef.current) return;
  submittingRef.current = true;
  // ...
}
```

## Vercel build error: "useSearchParams() should be wrapped in a suspense boundary"

The page uses a client hook that needs SSR/CSR boundary.

**Fix:** Move the hook into a separate client component and wrap with `<Suspense>` in the page component. Add `export const dynamic = "force-dynamic"` if appropriate.

## "Failed to fetch" in browser, but Supabase dashboard works

Anon key wrong in Vercel env vars, or `NEXT_PUBLIC_SUPABASE_URL` missing trailing path.

**Fix:** verify env vars in Vercel Settings → Environment Variables. Both keys should be in `production`, `preview`, AND `development` targets.

## Emails not arriving

1. Check `RESEND_API_KEY` is set in Vercel env vars (and the value starts with `re_`)
2. Check `RESEND_FROM_EMAIL` is a verified sender (default `onboarding@resend.dev` works for dev)
3. Look at Resend dashboard → Logs for delivery status

## Vercel deploy stuck in BUILDING > 5 min

Usually a cold install. Retry via Vercel API:
```bash
curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"name":"pr-system","gitSource":{"type":"github","ref":"main","repoId":1246071936}}' \
  https://api.vercel.com/v13/deployments
```

## Supabase Auth: user can't log in after sign-up

By default Supabase requires email confirmation. Either:
- Tell the user to check inbox / spam for the confirmation link, OR
- Disable email confirmation in Supabase dashboard → Authentication → Settings (only for dev)
