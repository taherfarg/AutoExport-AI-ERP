# Phase 18: Service / Workshop Plan

**Architecture:** Supabase/Postgres owns service records and RLS. Next.js server actions validate mutations and audit writes. The UI follows the existing operational dashboard pattern.

## 1. Documentation

- Create: `docs/superpowers/specs/2026-05-20-phase-18-service-workshop-design.md`
- Create: `docs/superpowers/plans/2026-05-20-phase-18-service-workshop.md`
- Commit docs with `docs: plan phase 18 service workshop`.

## 2. Database and RLS

- Create: `supabase/migrations/<timestamp>_phase_18_service_workshop.sql`
- Create: `supabase/tests/phase_18_service_workshop.sql`

Tasks:

- [ ] Add service enums for order status, job status, labor type, appointment status, inspection result, warranty status, and technician status.
- [ ] Add module and permissions: `view_service`, `manage_service`, `assign_service_jobs`, `manage_warranty_claims`.
- [ ] Add tables: `technicians`, `service_orders`, `service_jobs`, `service_labor_lines`, `inspection_checklists`, `inspection_results`, `warranty_claims`, `service_appointments`.
- [ ] Add indexes, grants, RLS policies, and updated_at triggers.
- [ ] Add seed checklist, technicians, and sample service records for dev companies.
- [ ] Add pgTAP tests for RLS isolation and core workflow.

## 3. Business Logic and Validation

- Create: `lib/service/calculations.ts`
- Create: `lib/service/format.ts`
- Create: `lib/validations/service.ts`
- Create: `tests/unit/service.test.ts`

Tasks:

- [ ] Add service order total and margin helpers.
- [ ] Add job duration helper.
- [ ] Add inspection score helper.
- [ ] Add warranty claim balance helper.
- [ ] Add Zod schemas for service actions.

## 4. Backend Actions and Queries

- Create: `features/service/queries.ts`
- Create: `features/service/actions.ts`

Tasks:

- [ ] Query orders, jobs, technicians, labor lines, checklists, inspection results, claims, and appointments.
- [ ] Create technician, appointment, service order, service job, labor line, inspection result, and warranty claim.
- [ ] Enforce server-side permissions.
- [ ] Audit sensitive service mutations.
- [ ] Revalidate `/service/workshop`.

## 5. UI

- Create: `app/(app)/service/workshop/page.tsx`
- Create: `app/(app)/service/workshop/service-action-forms.tsx`
- Update module registry and permission constants.

Tasks:

- [ ] Build service dashboard with KPI cards and operational tables.
- [ ] Add client-enhanced forms with success/error feedback.
- [ ] Add service status badges using existing badge patterns.
- [ ] Keep route responsive and package-gated through the service module.

## 6. E2E and Docs

- Update: `tests/e2e/auth-workspace.spec.ts`
- Create: `docs/phase-18-service-workshop.md`
- Update: `README.md`

Tasks:

- [ ] Add `/service/workshop` to protected route checks.
- [ ] Extend main workflow to create workshop records.
- [ ] Document scope and remaining limitations.

## 7. Verification and Commit

Run:

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `npx supabase db reset`
- [ ] `npx supabase test db`
- [ ] `npm run test:e2e`

Commit implementation with `feat: add service workshop phase`.
