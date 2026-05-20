# Phase 12 VIN, Valuation & Vehicle Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build provider-ready VIN decoding, market valuation, competitor pricing, and vehicle history intelligence for inventory and pricing workflows.

**Architecture:** Supabase stores all vehicle intelligence records with tenant-scoped RLS. Next.js server actions validate forms, enforce current workspace isolation, write advisory intelligence snapshots, and revalidate vehicle/pricing pages. Domain helpers keep VIN normalization and valuation math testable outside the UI.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Postgres/RLS, Supabase Auth, Zod, Vitest, Playwright.

---

### Task 1: Docs Commit

**Files:**
- Create: `docs/superpowers/specs/2026-05-20-phase-12-vin-valuation-intelligence-design.md`
- Create: `docs/superpowers/plans/2026-05-20-phase-12-vin-valuation-intelligence.md`

- [x] Write the Phase 12 design doc.
- [x] Write this implementation plan.
- [ ] Commit docs before schema/code work.

### Task 2: Database, RLS, Seeds, And pgTAP

**Files:**
- Create: `supabase/migrations/<timestamp>_phase_12_vehicle_intelligence.sql`
- Create: `supabase/tests/phase_12_vehicle_intelligence.sql`

- [ ] Create provider/status/history enums.
- [ ] Create `vin_decode_requests`.
- [ ] Create `vehicle_market_values`.
- [ ] Create `vehicle_competitor_prices`.
- [ ] Create `vehicle_history_reports`.
- [ ] Create `vehicle_enrichment_logs`.
- [ ] Add indexes, grants, RLS policies, and updated_at triggers.
- [ ] Seed example intelligence records for existing demo vehicles.
- [ ] Add pgTAP tests for RLS, seed data, and same-company access.

### Task 3: Domain Helpers And Validation

**Files:**
- Create: `lib/vehicles/intelligence.ts`
- Modify: `lib/validations/vehicle.ts`
- Create: `tests/unit/vehicle-intelligence.test.ts`

- [ ] Write failing tests for VIN normalization, invalid VIN detection, valuation recommendation, price spread, and enrichment summaries.
- [ ] Implement `normalizeVin`, `isLikelyVin`, `calculateValuationRecommendation`, and `summarizeVehicleIntelligence`.
- [ ] Add Zod schemas for decode, valuation, competitor price, and history report forms.
- [ ] Run targeted unit tests and confirm green.

### Task 4: Queries And Actions

**Files:**
- Modify: `features/vehicles/queries.ts`
- Modify: `features/vehicles/actions.ts`

- [ ] Query latest VIN decode, latest valuation, competitor prices, history reports, and enrichment logs.
- [ ] Add `createVinDecodeRequest`.
- [ ] Add `createVehicleMarketValue`.
- [ ] Add `createVehicleCompetitorPrice`.
- [ ] Add `createVehicleHistoryReport`.
- [ ] Write enrichment log rows and audit logs for each action.
- [ ] Return structured `{ success, error }` results for client-enhanced forms.

### Task 5: Vehicle Intelligence UI

**Files:**
- Create: `app/(app)/vehicles/[vehicleId]/vehicle-intelligence-forms.tsx`
- Modify: `app/(app)/vehicles/[vehicleId]/page.tsx`
- Modify: `app/(app)/vehicles/pricing/page.tsx`

- [ ] Add a vehicle detail intelligence section.
- [ ] Add forms for manual VIN decode, valuation, competitor price, and history report.
- [ ] Show latest valuation and competitor prices on the smart pricing page.
- [ ] Keep all UI advisory; do not update selling price automatically.

### Task 6: E2E, Docs, And Verification

**Files:**
- Modify: `tests/e2e/auth-workspace.spec.ts`
- Modify: `README.md`
- Create: `docs/phase-12-vehicle-intelligence.md`

- [ ] Extend E2E for vehicle intelligence creation and visibility.
- [ ] Document Phase 12 behavior, provider placeholders, and non-goals.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation.
