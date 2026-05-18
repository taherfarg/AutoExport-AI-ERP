# Phase 2A Vehicle Inventory Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production vehicle inventory vertical slice for AutoSphere ERP.

**Architecture:** Add Supabase/PostgreSQL vehicle tables with tenant and branch constraints, RLS policies using Phase 1 helper functions, TypeScript business logic for pricing calculations, server actions for mutations, and App Router pages for inventory and details. Keep cost/profit visibility permission-aware and leave binary file upload for the later document/storage phase.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/RLS, Zod, Vitest, pgTAP, Playwright.

---

## Tasks

- [ ] Create Supabase migrations for vehicle enums, tables, indexes, triggers, grants, RLS policies, and seed data.
- [ ] Add SQL tests for tenant isolation, RLS coverage, unique VIN/stock number constraints, and cost calculations.
- [ ] Add TypeScript pricing/business logic and unit tests.
- [ ] Add Zod vehicle validation and server-side vehicle actions.
- [ ] Add vehicle queries and permission-aware formatting helpers.
- [ ] Build `/vehicles` inventory list with KPIs, filters, table, and add form.
- [ ] Build `/vehicles/[vehicleId]` detail page with cost cards, specs, timeline, and metadata sections.
- [ ] Update dashboard and docs for Phase 2A.
- [ ] Run full verification and commit.

## Verification Commands

```powershell
npm run lint
npm run test
npx tsc --noEmit
npm run build
npx supabase db reset
npx supabase test db
npm run test:e2e
```

