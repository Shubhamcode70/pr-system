# PR System

Purchase Request creation, approval, and tracking — Next.js 14 + Supabase + Resend, deployable on Vercel free tier.

## What's included (Phase-1 MVP)

- Email/password auth (Supabase Auth)
- Roles: Requester / Approver / Admin
- PR Create wizard (SAP-aligned header + up to 100 line items)
- Dynamic 5-level amount-based approval routing
- Approve / Reject / Revert with mandatory comments
- Audit log on every create / update / approval
- Email notifications via Resend
- Admin: Users + Role Group assignment, view of Approval Rules, link-outs to master data, Audit Log viewer
- Excel export of PRs, Line Items, Approvals (admin only)
- INR currency formatting
- Mobile-responsive layout

## Local development

```bash
cd pr-system
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

The app runs at http://localhost:3000.

See `DEPLOY.md` for full deploy steps.
