# AutoSphere ERP

Production white-label Automotive SaaS ERP for car showrooms, dealers, brokers, import/export companies, and multi-branch automotive groups.

## Target Users

- Car showrooms and dealers
- Automotive brokers
- Import/export companies
- Multi-branch automotive trading groups
- GCC and global vehicle trading teams

## Main Modules

- SaaS foundation, companies, branches, users, roles, permissions, and subscriptions
- Vehicle inventory and global stock
- CRM, leads, quotations, reservations, invoices, and payments
- Import/export, shipping, customs, and documents
- Finance Lite, marketing, reports, alerts, chat, and AI intelligence

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-compatible components
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- Supabase Storage-ready architecture
- Vitest
- Playwright

## Local Development

1. Install dependencies with `npm install`.
2. Start Docker Desktop.
3. Start Supabase with `npx supabase start`.
4. Copy local Supabase values into `.env.local`.
5. Reset the database with `npx supabase db reset`.
6. Start the app with `npm run dev`.

The local Supabase config uses `554xx` ports because the default `543xx` range can be reserved on Windows.

## Environment Variables

Use `.env.example` as the template:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit `.env.local` or service-role secrets.

## Database Migrations

Migrations live in `supabase/migrations`.

Run:

```powershell
npx supabase db reset
```

Phase 1 migrations create:

- Core SaaS tables
- Tenant consistency constraints
- RLS helper functions and policies
- Package, module, and permission seed data
- Vehicle inventory tables, RLS policies, and seed vehicles
- Vehicle media storage bucket, storage policies, and document checklist rows

## RLS Model

Every tenant-owned table uses `company_id`. Branch-scoped tables also validate that `branch_id` belongs to the same company. RLS policies use active company memberships, branch access, and permission checks. Authorization data is stored in database tables, not editable user metadata.

## Role and Permission System

Phase 1 roles are tenant-scoped. Company onboarding creates a `Company Owner` role with all seeded permissions and assigns it to the workspace creator.

## AI Architecture

AI is planned as a permission-aware server-side layer. AI requests, generated actions, and approvals will be stored and audited. Sensitive actions require human approval.

## Payment Architecture

Subscriptions are modeled with packages, modules, and company subscriptions. Stripe integration is planned after the foundation is stable, with room for local payment gateways later.

## Integration Roadmap

- WhatsApp Business API / Meta Cloud API
- Instagram/Facebook Graph API
- Email provider
- Digital signature provider
- Shipping/logistics provider

## Verification

Run:

```powershell
npm run lint
npm run test
npm run test:e2e
npx supabase db reset
npx supabase test db
```

## Deployment

- Frontend: Vercel
- Backend: Supabase
- Separate dev, staging, and production environments
- Production secrets managed through deployment environment variables

## Known Limitations

- Phase 1 implements the SaaS foundation, Phase 2A implements the vehicle inventory core, and Phase 2B implements vehicle media/document checklist workflows.
- CRM, sales, payments, export, finance, AI, alerts, chat, and reports are represented in module gating but built in later phases.
- Digital signature, payment, messaging, and logistics integrations are architecture-ready but not integrated yet.

## Future Roadmap

See `docs/MASTER_BUILD_PROMPT.md`, `docs/superpowers/plans/2026-05-18-phase-1-saas-foundation.md`, `docs/superpowers/plans/2026-05-18-phase-2a-vehicle-inventory.md`, and `docs/superpowers/plans/2026-05-19-phase-2b-vehicle-documents-photos.md`.
