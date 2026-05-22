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
- Finance Lite, marketing, AI intelligence, reports, alerts, chat, and audit visibility
- VIN decoding, market valuation, competitor pricing, and vehicle history intelligence
- Website and marketplace sync control for listing publication
- Stripe-ready billing, customer portal, package upgrades, and usage enforcement
- F&I deal desk for finance structures, lender submissions, insurance/warranty products, and approvals
- Full Accounting for chart of accounts, journals, tax/VAT snapshots, bank reconciliation, and exports
- Supplier master data for AP aging, vendor balances, expenses, parts purchasing, and OCR supplier invoices
- Service Workshop for repair orders, job cards, technicians, inspections, warranty claims, and appointments
- Parts Inventory for catalog parts, suppliers, purchase orders, receipts, branch stock, transfers, service usage, reorder alerts, and parts profitability
- Advanced AI Automation for autonomous CRM scans, parts reorder proposals, vehicle marketing proposals, OCR document intake, and manager approval execution

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
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_BASE_URL=https://api.openai.com/v1
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_LIVE_BILLING_ENABLED=false
```

Never commit `.env.local` or service-role secrets.
Use `docs/launch-readiness.md` for the staging and production checklist.

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
- CRM customers, leads, follow-ups, messages, opportunities, RLS policies, and seed leads
- Sales quotations, reservations, proformas, invoices, payments, RLS policies, and payment triggers
- Import/export destination countries, logistics partners, export/import orders, shipping events, customs clearance, export documents, shipment costs, RLS policies, and workflow triggers
- Finance Lite expenses, receivables, payables, payment methods, bank/cash accounts, profit snapshots, salesperson commissions, RLS policies, and invoice-to-receivable sync triggers
- Central documents, document links, generic checklists, verification history, signature requests, signed document archive, private document storage bucket, and storage/RLS policies
- Marketing listing channels, vehicle listings, social post drafts, campaigns, content calendar, lead source metrics, RLS policies, and vehicle listing status sync triggers
- AI conversations, messages, requests, actions, approvals, document extraction jobs, report requests, RLS policies, and AI seed records
- Saved reports, report exports, report schedules, smart alerts, tasks, reminders, chat threads/messages, RLS policies, and operations seed records
- Vehicle intelligence tables for VIN decode requests, market values, competitor prices, history reports, and enrichment logs
- Marketplace sync tables for channels, price overrides, sync jobs/logs, and marketplace leads
- Billing customer records, provider event ledger, usage counters, and usage limit events
- F&I deal desk tables for lenders, insurance/warranty products, deals, finance applications, lender submissions, and deal approvals
- Full Accounting tables for GL accounts, accounting periods, journal entries/lines, tax rates/reports, bank transactions, bank reconciliations, and accounting exports
- Supplier master records linked to finance payables, expenses, parts purchase orders, and accounting review
- Service Workshop tables for technicians, service orders, service jobs, labor lines, inspection checklists/results, warranty claims, and appointments
- Parts Inventory tables for suppliers, catalog parts, branch stock, purchase orders, receipts, transfers, service part lines, and reorder alerts
- Advanced AI automation tables for background agents, OCR document extraction records, proposal approvals, RLS, and audit triggers

## RLS Model

Every tenant-owned table uses `company_id`. Branch-scoped tables also validate that `branch_id` belongs to the same company. RLS policies use active company memberships, branch access, and permission checks. Authorization data is stored in database tables, not editable user metadata.

## Role and Permission System

Phase 1 roles are tenant-scoped. Company onboarding creates a `Company Owner` role with all seeded permissions and assigns it to the workspace creator. Phase 3A adds CRM permissions for customers, leads, assignment, and follow-ups. Phase 4 adds sales and payment permissions for quotations, reservations, invoices, and payment recording. Phase 5 adds export viewing, export status updates, and logistics partner permissions. Phase 6 adds finance management and commission management permissions. Phase 7 adds central document viewing and internal signature management permissions. Phase 8 uses `manage_marketing` for listings, campaigns, content, and source metrics. Phase 9 uses `use_ai_assistant` plus each underlying business permission before exposing an AI tool. Phase 10 adds `manage_reports`, `view_alerts`, `manage_alerts`, and `use_chat`. Phase 12 adds `manage_vehicle_intelligence` for VIN decode, valuation, competitor pricing, and history report records. Phase 15 adds `view_billing` while keeping billing mutations behind `manage_subscriptions`. Phase 16 adds `view_deals`, `manage_deals`, and `approve_deals` for F&I deal desk workflows. Phase 17 adds `view_accounting`, `manage_accounting`, and `export_accounting` for general ledger, tax, bank, and export workflows. Phase 18 adds `view_service`, `manage_service`, `assign_service_jobs`, and `manage_warranty_claims` for workshop operations. Phase 19 adds `view_parts`, `manage_parts`, `manage_part_orders`, and `transfer_parts` for parts inventory. Phase 20 adds `view_ai_automation` and `manage_ai_automation` for autonomous agents, OCR commits, and manager-approved AI proposals. Phase 22 adds `manage_suppliers` for shared supplier/vendor master records.

## AI Architecture

AI is implemented as a permission-aware server-side layer. AI requests, generated actions, messages, approvals, report requests, and extraction jobs are stored and audited. Sensitive actions create approval records instead of mutating business data directly.

When `AI_PROVIDER=gemini` and `GEMINI_API_KEY` are configured, the assistant uses Gemini `generateContent` for tool routing and answer refinement while keeping all ERP data access inside permission-checked server tools. `AI_PROVIDER=openai` keeps the OpenAI-compatible Responses API path available. Without a configured key, the same tools run through the deterministic local fallback. AI tools are filtered by the current user's permissions, so finance, profit, documents, sales drafts, and reports cannot be exposed through AI unless the same user can access that data through the product.

## Payment Architecture

Subscriptions are modeled with packages, modules, company subscriptions, billing customers, billing events, usage counters, and usage limit events. Phase 15 creates Stripe Checkout Sessions, Stripe Customer Portal Sessions, and a signed webhook endpoint. Local development stays in simulated mode unless `STRIPE_LIVE_BILLING_ENABLED=true`, which prevents accidental live billing calls during tests.

## Integration Roadmap

- WhatsApp Business API / Meta Cloud API
- Instagram/Facebook Graph API
- Website inventory and marketplace sync adapters
- Email provider
- Digital signature provider
- Shipping/logistics provider

## Verification

Run:

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```

For one-command automated QA with a generated report:

```powershell
npm run qa:full
```

The report is written to `qa-reports/latest.md`. See `docs/automated-testing.md`.

## Deployment

- Frontend: Vercel
- Backend: Supabase
- Separate dev, staging, and production environments
- Production secrets managed through deployment environment variables
- `/api/health` can be used for deployment readiness checks
- Launch checklist: `docs/launch-readiness.md`

## Known Limitations

- Phase 1 implements the SaaS foundation, Phase 2A implements the vehicle inventory core, Phase 2B implements vehicle media/document checklist workflows, Phase 3A implements CRM leads/follow-ups, Phase 4 implements sales transactions/payments, Phase 5 implements import/export operations, Phase 6 implements Finance Lite, Phase 7 implements central documents/signatures, Phase 8 implements Marketing & Listings, and Phase 9 implements AI Technical Intelligence.
- Phase 10 implements reports, smart alerts, chat, notification handling, and audit log visibility foundations.
- Phase 12 implements vehicle intelligence records and UI. Live VIN, valuation, and history provider integrations are still adapter-ready rather than connected.
- Phase 13 implements website and marketplace sync control. Live marketplace APIs are still adapter-ready rather than connected.
- Phase 14 implements communications provider settings, consent rules, template parsing, and outbound dispatch workflows.
- Phase 15 implements Stripe-ready billing sessions, webhook event handling, and usage limit tracking. Live Stripe calls require server-side keys and `STRIPE_LIVE_BILLING_ENABLED=true`.
- Phase 16 implements F&I deal desk records, payment calculations, lender submissions, product gross tracking, and manager approvals. Live lender integrations are provider-ready but manual by default.
- Phase 17 implements full accounting foundations: chart of accounts, journals, tax reports, bank reconciliation, and export records. Automated posting from every operational workflow remains a future accounting automation layer.
- Phase 18 implements Service Workshop records, job cards, labor lines, inspections, warranty claims, and appointments.
- Phase 19 implements Parts Inventory with catalog parts, suppliers, branch stock, purchase orders, receipts, transfers, service consumption, reorder alerts, and parts profitability.
- Phase 20 implements Advanced AI Automation with agent controls, OCR document intake, proposal queues, manager approval execution, and audit trails.
- Phase 22 implements shared supplier master records, supplier AP aging, supplier-linked payables/expenses, and accounting supplier review.
- Gemini and OpenAI-compatible AI provider calls are implemented, but live AI responses require a server-side provider API key.
- External digital signature providers, payment, messaging, and logistics integrations are architecture-ready but not integrated yet.

## Future Roadmap

See `docs/MASTER_BUILD_PROMPT.md`, `docs/phase-12-vehicle-intelligence.md`, `docs/phase-13-marketplace-sync.md`, `docs/phase-14-communications.md`, `docs/phase-17-full-accounting.md`, `docs/phase-18-service-workshop.md`, `docs/phase-19-parts-inventory.md`, `docs/phase-20-advanced-ai-automation.md`, `docs/phase-22-supplier-accounting-upgrade.md`, `docs/superpowers/plans/2026-05-18-phase-1-saas-foundation.md`, `docs/superpowers/plans/2026-05-18-phase-2a-vehicle-inventory.md`, `docs/superpowers/plans/2026-05-19-phase-2b-vehicle-documents-photos.md`, `docs/superpowers/plans/2026-05-19-phase-3a-crm-leads.md`, `docs/superpowers/plans/2026-05-19-phase-4-sales-transactions.md`, `docs/superpowers/plans/2026-05-19-phase-5-import-export.md`, `docs/superpowers/plans/2026-05-19-phase-6-finance-lite.md`, `docs/superpowers/plans/2026-05-19-phase-7-documents-signature.md`, `docs/superpowers/plans/2026-05-19-phase-8-marketing-listings.md`, `docs/superpowers/plans/2026-05-19-phase-9-ai-intelligence.md`, `docs/superpowers/plans/2026-05-19-phase-10-reports-alerts-chat.md`, `docs/superpowers/plans/2026-05-20-phase-12-vin-valuation-intelligence.md`, `docs/superpowers/plans/2026-05-20-phase-13-marketplace-sync.md`, `docs/superpowers/plans/2026-05-20-phase-15-stripe-billing-usage.md`, `docs/superpowers/plans/2026-05-20-phase-16-fi-deal-desk.md`, `docs/superpowers/plans/2026-05-20-phase-17-full-accounting.md`, `docs/superpowers/plans/2026-05-20-phase-18-service-workshop.md`, `docs/superpowers/plans/2026-05-20-phase-19-parts-inventory.md`, `docs/superpowers/plans/2026-05-20-phase-20-advanced-ai-automation.md`, and `docs/superpowers/plans/2026-05-22-phase-22-supplier-accounting-upgrade.md`.
