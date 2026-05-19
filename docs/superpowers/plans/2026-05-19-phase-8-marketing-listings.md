# Phase 8 Marketing And Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production marketing listings, social drafts, campaigns, content calendar, and lead source tracking.

**Architecture:** Supabase owns marketing data, RLS, triggers, and seed rows. Next.js server actions validate mutations with Zod, enforce `manage_marketing`, and write audit logs. The UI follows the existing single-route operational dashboard pattern used by finance, export, and documents.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Postgres/RLS, Supabase Auth, Vitest, Playwright.

---

### Task 1: Database, RLS, Seeds, And pgTAP

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_8_marketing_listings.sql`
- Create: `supabase/tests/phase_8_marketing_listings.sql`

- [ ] Create marketing enums.
- [ ] Create `listing_channels`, `marketing_listings`, `social_posts`, `campaigns`, `content_calendar`, and `lead_sources`.
- [ ] Add indexes, grants, RLS, soft deletes, and updated_at triggers.
- [ ] Add trigger to sync vehicle listing/social status after listing and social post changes.
- [ ] Seed default listing channels and lead sources for existing companies.
- [ ] Add pgTAP tests for RLS, tenant isolation, seeded channels, and vehicle status sync.

### Task 2: Domain Helpers

**Files:**
- Create: `lib/marketing/calculations.ts`
- Create: `lib/marketing/format.ts`
- Create: `lib/validations/marketing.ts`
- Create: `components/marketing/marketing-status-badge.tsx`
- Create: `tests/unit/marketing.test.ts`

- [ ] Write failing tests for campaign metrics, listing draft generation, formatting, and validation.
- [ ] Implement deterministic listing/social draft helpers.
- [ ] Add Zod schemas for listings, social posts, campaigns, content calendar, and lead sources.
- [ ] Add marketing status badge component.

### Task 3: Queries And Actions

**Files:**
- Create: `features/marketing/queries.ts`
- Create: `features/marketing/actions.ts`

- [ ] Add marketing permission helper.
- [ ] Query listings, channels, social posts, campaigns, content calendar, lead sources, and vehicle options.
- [ ] Add actions to create listing, create social post, create campaign, create calendar entry, and upsert lead source metrics.
- [ ] Add server-side permission checks and audit logs.
- [ ] Revalidate `/marketing/listings` after mutations.

### Task 4: UI Route

**Files:**
- Create: `app/(app)/marketing/listings/page.tsx`

- [ ] Build marketing KPI cards.
- [ ] Build listing table and create listing form.
- [ ] Build social draft form and recent post list.
- [ ] Build campaign form and campaign cards.
- [ ] Build content calendar and lead source performance panels.
- [ ] Keep forms permission-aware.

### Task 5: Verification And Docs

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-8-marketing-listings.md`

- [ ] Extend E2E to create a listing, social post, campaign, and lead source metric.
- [ ] Document Phase 8 behavior, security notes, and integration placeholders.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.
