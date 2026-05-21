# Code Review Checklist

Use this before merging any Phase 2 milestone branch to `main`.

## Security
- [ ] No new secrets hard-coded
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only used in `lib/supabase/server.ts` or `/api/*` routes
- [ ] No `'use client'` file imports from `lib/supabase/server.ts`
- [ ] All user input validated server-side (Zod or manual)
- [ ] All new tables have RLS enabled and policies defined
- [ ] Cross-table RLS checks use `SECURITY DEFINER` helpers — never inline `EXISTS` that could recurse
- [ ] File uploads validated for MIME type + size; storage path uses `auth.uid()` namespace
- [ ] No `dangerouslySetInnerHTML` on user-supplied content

## Correctness
- [ ] Server actions have explicit return types `Promise<{ ok: true } | { error: string }>` (or equivalent)
- [ ] Client narrows on `'ok' in res` / `'id' in res` — not `'error' in res`
- [ ] Double-submit guard (`useRef`) on any async submit
- [ ] Friendly translations for all new FK constraints
- [ ] Required fields validated client-side BEFORE server call
- [ ] Database migrations are idempotent and additive (no DROP)
- [ ] Audit log captures the new action

## Performance
- [ ] No N+1 queries (use joins / `select` with relationships)
- [ ] Indexes on FK columns and any column used in WHERE/ORDER BY
- [ ] Large list pages are paginated
- [ ] No unnecessary `force-dynamic` (only when reading auth-scoped data)

## Build / Deploy
- [ ] `npm run build` passes locally
- [ ] No TypeScript errors
- [ ] No new ESLint errors in changed files
- [ ] Migration applied to live DB AND committed to `supabase/migrations/`
- [ ] Preview deploy is READY on Vercel
- [ ] E2E smoke tests pass against preview URL

## Documentation
- [ ] ADR written and committed (`docs/adr/`)
- [ ] CHANGELOG.md updated
- [ ] Field-help (`lib/field-help.ts`) extended for any new form fields
- [ ] README updated if user-facing behaviour changes
