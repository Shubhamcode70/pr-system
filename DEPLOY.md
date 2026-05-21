# Deployment Guide — PR System

End-to-end deploy in ~30 minutes. All services used are free tier.

## Step 1 — Create the four accounts

1. **GitHub** — https://github.com/signup
2. **Supabase** — https://supabase.com/dashboard/sign-up (sign in with GitHub)
3. **Resend** — https://resend.com/signup (sign in with GitHub)
4. **Vercel** — https://vercel.com/signup (sign in with GitHub)

## Step 2 — Create the Supabase project

1. Supabase dashboard → **New Project**.
2. Name: `pr-system`. Region: **Mumbai (ap-south-1)** (closest to India).
3. Set a strong database password — **save it**, you may need it later.
4. Wait ~2 minutes for provisioning.

## Step 3 — Apply the database schema

In the Supabase dashboard, go to **SQL Editor → New query**, then run these files in order:

1. `supabase/schema.sql` — creates all tables, triggers, sequences, audit log
2. `supabase/policies.sql` — enables Row-Level Security
3. `supabase/seed.sql` — inserts master data, role groups, default approval rules
4. `supabase/storage.sql` — creates the file storage bucket + policies

Copy-paste each file's contents into the SQL editor and click **Run**.

## Step 4 — Promote your admin user

In Supabase dashboard:
1. Go to **Authentication → Users → Add user** → create user with email `shubhamjadhav.code@gmail.com` and a temporary password (or sign up from the app first, then come back here).
2. Go to **SQL Editor**, run:
   ```sql
   update public.app_users set is_admin = true where email = 'shubhamjadhav.code@gmail.com';
   ```

## Step 5 — Get your Supabase keys

In Supabase: **Project Settings → API**. Copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep private!)

## Step 6 — Create the Resend API key

In Resend dashboard:
1. **API Keys → Create API Key** → name `pr-system` → permission **Send only**. Save the key.
2. (Optional, for production) **Domains → Add Domain** → add the DNS records → wait for verification. For dev you can keep `onboarding@resend.dev` as the sender.

## Step 7 — Push the code to GitHub

```bash
cd pr-system
git init
git add .
git commit -m "Initial commit: PR System MVP"
git branch -M main

# Create a new empty repo on github.com first (no README, .gitignore, or license)
git remote add origin https://github.com/YOUR_USERNAME/pr-system.git
git push -u origin main
```

## Step 8 — Deploy on Vercel

1. https://vercel.com/new → **Import** your `pr-system` GitHub repo.
2. Framework Preset is auto-detected as **Next.js**. Leave defaults.
3. Expand **Environment Variables** and add these 6:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Step 5 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Step 5 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Step 5 |
   | `RESEND_API_KEY` | from Step 6 |
   | `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (or your verified sender) |
   | `APP_URL` | leave blank for first deploy — fill in after step 9 |

4. Click **Deploy**. Build takes ~2 minutes.

## Step 9 — Set APP_URL and redeploy

After the first deploy you'll get a URL like `https://pr-system-xxxx.vercel.app`.
1. Vercel → **Settings → Environment Variables** → add/edit `APP_URL` to that URL.
2. Vercel → **Deployments → ⋮ → Redeploy**.

## Step 10 — First login

1. Open your Vercel URL.
2. Click **Sign up** and create an account with the admin email.
3. If you skipped Step 4, run the admin-promotion SQL now.
4. Log in, go to **Admin → Users & Role Groups**, assign yourself (and others) to the appropriate role groups.

## Step 11 — Smoke test

1. **New PR** → fill in header, add a line item, submit. Total < ₹50,000 → routes to Level 1.
2. Assign your user to "Reporting Manager" group; you'll see the PR in **Approval Queue**.
3. Open it → Approve. Watch the timeline update.
4. Try a CAPEX PR → verify CR ID + Asset Number are mandatory.
5. Try a >₹50L PR → verify it walks through all 5 levels (assign yourself to each group temporarily for testing).

## Common issues

- **"No active approval rule matches"** on submit → run `seed.sql` in Step 3.
- **Approver doesn't see PRs in Queue** → ensure the user is a member of the relevant role group (Admin → Users).
- **Emails don't arrive** → check `RESEND_API_KEY` is set; verify the sender domain (or use `onboarding@resend.dev`).
- **RLS errors** when querying tables → ensure `policies.sql` ran without errors; the admin promotion SQL must be executed.
- **`pr_attachments` storage** → file uploads are not enabled in Phase-1 UI; the schema, bucket, and policies are in place for Phase 2.

## Free tier limits to be aware of

- **Vercel Hobby**: 100 GB bandwidth / month — fine for < 50 users.
- **Supabase Free**: 500 MB DB, 1 GB Storage, 2 GB egress / month, 50K MAU — fine for thousands of PRs.
- **Resend Free**: 3,000 emails / month, 100 / day.
