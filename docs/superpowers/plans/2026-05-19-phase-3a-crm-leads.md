# Phase 3A CRM Leads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production CRM leads foundation with Supabase schema/RLS, server actions, lead pages, and verification.

**Architecture:** Add CRM as a tenant-scoped module beside vehicles. Database policies enforce company, branch, and assignment access; Next.js server components/actions use the authenticated Supabase client so RLS is exercised by the app.

**Tech Stack:** Supabase/Postgres/RLS, Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Zod, Vitest, pgTAP, Playwright.

---

### Task 1: Database And Permissions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_3a_crm_leads.sql`
- Create: `supabase/tests/phase_3a_crm_leads.sql`
- Modify: `lib/permissions/permissions.ts`

- [ ] Create CRM enums and tables for customers, leads, lead messages, follow-ups, opportunities, and customer notes.
- [ ] Add CRM permissions and assign them to existing company owner/system owner roles.
- [ ] Add indexes for company, branch, status, assignment, source, and due dates.
- [ ] Enable RLS on every new public table.
- [ ] Grant authenticated access explicitly for Data API compatibility.
- [ ] Add policies for tenant, branch, and assigned-salesperson access.
- [ ] Add GCC/global seed customers and leads.
- [ ] Add pgTAP tests for RLS and tenant isolation.

### Task 2: CRM Domain Code

**Files:**
- Create: `lib/validations/crm.ts`
- Create: `lib/crm/format.ts`
- Create: `features/crm/queries.ts`
- Create: `features/crm/actions.ts`
- Create: `components/crm/lead-status-badge.tsx`
- Create: `tests/unit/crm.test.ts`

- [ ] Write failing unit tests for lead stats, status labels, and overdue follow-up detection.
- [ ] Implement CRM formatting helpers.
- [ ] Add Zod schemas for create lead, update lead status, create follow-up, and log message.
- [ ] Add query functions for lead list, lead detail, follow-ups, messages, and matching available vehicles.
- [ ] Add server actions that validate input, rely on RLS, update lead timestamps, and revalidate CRM routes.

### Task 3: CRM Pages

**Files:**
- Create: `app/(app)/crm/leads/page.tsx`
- Create: `app/(app)/crm/leads/[leadId]/page.tsx`

- [ ] Build `/crm/leads` with KPIs, filters, table, pipeline columns, and add-lead form.
- [ ] Build `/crm/leads/[leadId]` with status update, profile data, follow-up form, message form, timeline, and matching vehicles.
- [ ] Keep data fetching server-side and parallelize independent requests.
- [ ] Add empty states and permission-aware create/update controls.

### Task 4: E2E And Verification

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `docs/phase-3a-crm-leads.md`
- Modify: `README.md`

- [ ] Extend the workspace E2E flow to create a lead, add a follow-up, and log a message.
- [ ] Document the phase and verification commands.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit docs and implementation in small, reviewable commits.

