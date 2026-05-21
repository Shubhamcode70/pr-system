# ADR-0001: Vendor Master & Multi-Vendor Quotations

**Status:** Accepted
**Date:** 2026-05-22
**Deciders:** Shubham
**Milestone:** Phase 2 — 2A

## Context

The Phase 1 PR creation flow captures a free-text `preferred_vendor_name` and a `single_vendor_flag` + `single_vendor_justification`. There is no central vendor list, no GST/PAN validation, no MSME flag, and no way to compare competing vendor quotations against a single PR.

The SAP PR Checksheet explicitly requires "Single Vendor Justification … attach a supporting document wherever available" — implying multi-vendor comparison is the default path and single-vendor is an exception that needs justification.

We need to:
1. Centralise vendor data so PRs reference vendors by code, not by free text.
2. Capture vendor onboarding documents (PAN, GST, MSME cert, cancelled cheque) in Supabase Storage.
3. Let requesters attach one or more vendor quotations to a PR, with the chosen vendor explicitly selected.
4. Trigger `single_vendor_flag` automatically when only one quotation is recorded.

## Decision

Add two new tables — `vendors` and `pr_quotations` — plus a vendor onboarding flow accessible from the PR creation wizard. The existing `preferred_vendor_name` text column is **kept** for back-compat (existing PRs reference vendors by name) but the new flow uses `pr_quotations.vendor_id` as the source of truth.

The new flow is **opt-in per PR**: a requester can either keep typing a vendor name (Phase-1 behaviour) or open the new "Add Vendor / Quotation" panel to use the master. This preserves backward compatibility and lets the team migrate at their own pace.

## Options Considered

### Option A: Replace the free-text field entirely with a vendor picker

| Dimension | Assessment |
|-----------|------------|
| Complexity | High — every existing PR needs migration logic |
| Cost | Medium — engineering time |
| Scalability | Best long term |
| Team familiarity | Low — users have to onboard vendors first |

**Pros:** Single source of truth, no two-system drift.
**Cons:** Breaking change. Existing PRs become invalid. Forces every vendor onboarding to happen before any PR can be raised.

### Option B (Chosen): Add vendor master alongside free-text, opt-in per PR

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — purely additive |
| Cost | Low |
| Scalability | Good — pickers can become the default later |
| Team familiarity | Medium — gradual transition |

**Pros:** Non-breaking. Existing PRs continue to validate. Adoption is gradual. Phase 1 production is untouched.
**Cons:** Two ways of recording vendor info coexist until full migration.

### Option C: Vendor master as a separate microservice

Rejected — out of scope for a free-tier Next.js + Supabase deployment. Adds operational complexity without benefit at < 50 users.

## Trade-off Analysis

| Trade-off | Why Option B wins |
|---|---|
| Backward compat vs. cleanliness | Backward compat — Phase 1 is in production with live data. |
| Speed vs. completeness | Speed — opt-in lets us ship 2A in days, not weeks. |
| User friction vs. data quality | Slight initial friction (onboard vendor before quote) but quality wins fast. |

## Data Model

```sql
vendors
  id uuid PK
  vendor_code text UNIQUE        -- auto: VEND-NNNNN
  legal_name text NOT NULL
  trade_name text
  gstin text                     -- 15 chars, regex validated
  pan text                       -- 10 chars
  msme_registered boolean
  msme_certificate_path text     -- Supabase Storage path
  address_line1/2/city/state/pincode/country
  contact_name/email/phone
  bank_name/account_no/ifsc      -- shown only to Finance role
  payment_terms text             -- Net 0/15/30/45/60/Advance
  currency text DEFAULT 'INR'
  status text                    -- draft / active / on_hold / blacklisted
  onboarded_by uuid -> app_users
  created_at / updated_at

pr_quotations
  id uuid PK
  pr_id uuid -> purchase_requests
  vendor_id uuid -> vendors
  quote_reference text
  quote_date date
  validity_date date
  total_amount numeric(14,2)
  currency text
  payment_terms_offered text
  delivery_lead_time_days smallint
  attachment_id uuid -> pr_attachments
  notes text
  is_selected boolean            -- exactly one TRUE per pr_id (partial unique index)
  created_at
```

## Consequences

**Becomes easier:**
- Auditable record of which vendor was chosen and what the alternatives were.
- Pre-validated GSTIN / PAN reduces invoice rejections later.
- Single-vendor flagging can be automatic instead of manual.

**Becomes harder:**
- Two vendor-storage approaches coexist (text field + FK). The UI must handle both. Tracked as tech debt.
- Vendor onboarding is gated behind admin status (initially) — slows first-time use.

**Will need to revisit:**
- When > 80% of PRs use the new vendor master, deprecate `preferred_vendor_name` column (write a follow-up ADR).
- Add a "blacklisted" enforcement check on submit (next milestone consideration).

## Action Items

1. [ ] Migration `supabase/migrations/0001_vendors_and_quotations.sql` (additive)
2. [ ] RLS policies: read all logged-in, write admin or self-onboarded (drafts only)
3. [ ] `GET /admin/vendors` — list, search, blacklist, reactivate
4. [ ] `POST /admin/vendors/new` — onboarding form with file uploads
5. [ ] PR create wizard — new "Vendor & Quotations" sub-step before submit
6. [ ] Auto-set `single_vendor_flag` when exactly one quotation
7. [ ] E2E test: create vendor → onboard → attach 3 quotations → select 1 → submit PR
8. [ ] Documentation update: README + ARCHITECTURE.md
