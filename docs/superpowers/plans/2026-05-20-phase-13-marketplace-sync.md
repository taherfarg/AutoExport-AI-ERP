# Phase 13 Marketplace Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add website and marketplace sync control to the existing Marketing & Listings module.

**Architecture:** Extend Phase 8 marketing with new tenant-owned marketplace tables, server-side actions, and UI panels. Keep all provider behavior manual/provider-ready while enforcing permissions, RLS, audit logs, and tests.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/RLS, Zod, Vitest, Playwright, Tailwind/shadcn-style UI.

---

## File Structure

- Create `supabase/migrations/*_phase_13_marketplace_sync.sql` for schema, RLS, triggers, and seeds.
- Create `supabase/tests/phase_13_marketplace_sync.sql` for pgTAP coverage.
- Create `lib/marketing/marketplace.ts` for pure sync helpers.
- Modify `lib/validations/marketing.ts` with Phase 13 action schemas.
- Modify `features/marketing/actions.ts` with marketplace action handlers.
- Modify `features/marketing/queries.ts` with marketplace query rows and dashboard data.
- Modify `app/(app)/marketing/listings/page.tsx` with sync, override, logs, and lead capture UI.
- Modify `tests/e2e/auth-workspace.spec.ts` to cover the new workflow.
- Create `tests/unit/marketplace-sync.test.ts` for TDD helper coverage.
- Add `docs/phase-13-marketplace-sync.md` and update `README.md`.

## Tasks

### Task 1: TDD Domain Helpers

- [ ] Write failing tests in `tests/unit/marketplace-sync.test.ts` for `buildMarketplacePayload`, `summarizeSyncJobs`, and `hasMarketplaceContact`.
- [ ] Run `npm run test -- tests/unit/marketplace-sync.test.ts` and confirm the missing module failure.
- [ ] Create `lib/marketing/marketplace.ts` with the three pure functions.
- [ ] Rerun the focused unit test and confirm it passes.

### Task 2: Supabase Schema and RLS

- [ ] Create migration with `npx supabase migration new phase_13_marketplace_sync`.
- [ ] Add enums, tables, indexes, triggers, grants, RLS policies, and seed marketplace channels.
- [ ] Create `supabase/tests/phase_13_marketplace_sync.sql` with pgTAP tests for RLS, seeds, tenant isolation, inserts, and lead-count sync.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.

### Task 3: Validation, Queries, and Actions

- [ ] Add Zod schemas for marketplace channel, price override, sync job, sync log, and marketplace lead forms.
- [ ] Extend marketing query types and `getMarketingDashboardData` to include marketplace channels, price overrides, sync jobs, sync logs, and marketplace leads.
- [ ] Add server actions: `createMarketplaceChannel`, `upsertListingPriceOverride`, `queueListingSyncJob`, `createListingSyncLog`, and `captureMarketplaceLead`.
- [ ] Ensure each action checks `manage_marketing`, validates company ownership, writes audit logs for sync/lead actions, and revalidates `/marketing/listings`.

### Task 4: UI and E2E

- [ ] Add Marketplace Sync panels to `app/(app)/marketing/listings/page.tsx`.
- [ ] Include forms with stable IDs for E2E: `#overridePrice`, `#syncOperation`, `#syncMessage`, `#marketplaceLeadName`, and `#marketplaceLeadPhone`.
- [ ] Extend the Playwright workspace flow to queue a sync job, log a sync event, save an override, and capture a marketplace lead.
- [ ] Run `npm run test:e2e`.

### Task 5: Documentation and Verification

- [ ] Add `docs/phase-13-marketplace-sync.md`.
- [ ] Update `README.md` with Phase 13 notes.
- [ ] Run full verification: `npm run lint`, `npm run test`, `npx tsc --noEmit`, `npm run build`, `npx supabase db reset`, `npx supabase test db`, and `npm run test:e2e`.
- [ ] Commit with `feat: add marketplace sync phase`.
