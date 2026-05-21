# Phase 2 — Plan

Phase 2 is developed on the `phase2` branch. Vercel auto-deploys it to a preview URL separate from production. Phase 1 (live on `main`) is untouched until each milestone is verified and merged.

## Branching & deployment

```
main      ──▶ pr-system-gules.vercel.app  (production, Phase 1)
phase2    ──▶ pr-system-git-phase2-...vercel.app  (preview, work in progress)
```

Each milestone is a small set of commits on `phase2`. After user verification, we either:
- merge `phase2` into `main` per-milestone (incremental ship), or
- keep all milestones on `phase2` and merge as one batch at the end.

Decision deferred until 2A is live and tested.

## Database strategy

Additive migrations only. No DROP, no destructive ALTER on existing tables.

All migrations live in `supabase/migrations/` with a numeric prefix. Each is idempotent (uses `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, etc.).

## Milestone list

| # | Milestone | Status | Deliverables |
|---|---|---|---|
| 2A | Vendor Master + Quotations | In progress | `vendors`, `pr_quotations`, vendor onboarding, multi-vendor comparison on PR create |
| 2B | Budget Check | Pending | `budgets`, reserved/consumed/available, soft warn / hard block, live indicator |
| 2C | Delegation + Escalation | Pending | `delegations`, time-based auto-escalation (Vercel Cron), manual reassign |
| 2D | In-app notifications + Realtime | Pending | `notifications`, bell icon, preferences, Supabase Realtime |
| 2E | PWA + WCAG AA | Pending | manifest, service worker, offline shell, axe-core in CI, keyboard nav |
| 2F | Master Data + Approval Rules UI | Pending | Native CRUD for UoM/MG/Plants/PG/CC/GL/CR/Asset + rules editor |
| 2G | Dashboard | Pending | Spend & approval analytics + SAP Tracker insights (Recharts) |

## Process per milestone

1. **ADR** — `docs/adr/NNNN-<title>.md` explaining the design decision
2. **Migration** — `supabase/migrations/NNNN_<title>.sql` applied to live DB additively
3. **Code** — server actions + UI components
4. **Code review** — internal checklist (`docs/runbooks/code-review.md`)
5. **E2E tests** — DB-level via psycopg2 + HTTP smoke
6. **Preview deploy** — Vercel auto-builds the branch
7. **User verification**
8. **Merge to main** when stable

## Skill mappings to this plan

- `engineering:architecture` → one ADR per milestone + final architecture doc with C4 diagrams
- `engineering:code-review` → reviewer checklist at `docs/runbooks/code-review.md`
- `engineering:debug` → debug runbook at `docs/runbooks/debug.md`
- `engineering:deploy-checklist` → `docs/runbooks/deploy.md` used before merge to main
- `engineering:documentation` → README, ARCHITECTURE.md, SECURITY.md updated each milestone
- `data:build-dashboard` → Milestone 2G

## Consolidated final deliverables (after 2G)

- `docs/ARCHITECTURE.md` — system overview with C4 (Context, Container, Component) Mermaid diagrams, data model ERD, deployment view
- `docs/SECURITY.md` — threat model, OWASP Top 10 mapping, controls matrix, RLS analysis, secrets-handling, dependency risks
- `docs/RUNBOOK.md` — operations runbook (deploy, rollback, hotfix, restore)
- `docs/CHANGELOG.md` — every commit grouped by version
