# Deploy Checklist

Use this before merging `phase2` (or a milestone branch) into `main`.

## Pre-deploy
- [ ] All items in `code-review.md` ticked
- [ ] Preview URL has been tested by at least one human
- [ ] No open red CI checks (if/when CI is added)
- [ ] Migrations applied to production Supabase **before** code merge (additive only)

## Deploy
- [ ] `git checkout main`
- [ ] `git pull --ff-only`
- [ ] `git merge --no-ff phase2`  (preserves the branch history)
- [ ] `git push origin main`
- [ ] Vercel auto-builds production deploy

## Verify
- [ ] Production deploy is READY
- [ ] Live URL smoke tests pass (see `automated-smoke.sh`)
- [ ] Audit log shows expected events for a test action
- [ ] No error spikes in Vercel Functions logs (first 5 min)

## Rollback
If anything is wrong within the first 15 min:
- [ ] Vercel dashboard → **Deployments** → pick the previous READY deploy → **Promote to Production**
- [ ] If the migration is causing the issue, run the rollback SQL in `supabase/migrations/NNNN_rollback.sql`
- [ ] Post-mortem: document in `docs/incidents/YYYY-MM-DD.md`

## Post-deploy
- [ ] Update `docs/CHANGELOG.md`
- [ ] Notify the team channel
- [ ] Bump version tag if using semver: `git tag v1.X.0 && git push --tags`
