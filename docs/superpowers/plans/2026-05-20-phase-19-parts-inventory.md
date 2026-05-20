# Phase 19 Parts Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production parts inventory for catalog, branch stock, suppliers, purchasing, receiving, transfers, service consumption, reorder alerts, and profitability.

**Architecture:** Supabase/Postgres owns parts records, stock movement side effects, RLS, and service-order total refresh. Next.js server actions validate mutations, enforce permissions, audit sensitive operations, and revalidate `/parts/inventory`. The UI follows the existing operational dashboard pattern from service/workshop.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/RLS, Zod, Tailwind/shadcn-style components, Vitest, pgTAP, Playwright.

---

## File Map

- Create `supabase/migrations/<timestamp>_phase_19_parts_inventory.sql`: enums, module/permissions, tables, triggers, RLS, grants, seed data.
- Create `supabase/tests/phase_19_parts_inventory.sql`: pgTAP RLS and stock workflow tests.
- Create `lib/parts/calculations.ts`: reusable pricing, stock, reorder, and profitability helpers.
- Create `lib/parts/format.ts`: parts number generation and display helpers.
- Create `lib/validations/parts.ts`: Zod schemas and enum lists for server actions and forms.
- Create `tests/unit/parts.test.ts`: unit coverage for helper functions and schemas.
- Create `features/parts/queries.ts`: service-role reads filtered by company.
- Create `features/parts/actions.ts`: server actions with permission checks and audit logs.
- Create `app/(app)/parts/inventory/page.tsx`: production parts dashboard UI.
- Create `app/(app)/parts/inventory/parts-action-forms.tsx`: client-enhanced action forms.
- Modify `lib/permissions/permissions.ts`: add parts permission constants.
- Modify `lib/modules/module-registry.ts`: add sidebar entry for parts inventory.
- Modify `tests/e2e/auth-workspace.spec.ts`: protect route and extend workflow.
- Create `docs/phase-19-parts-inventory.md`: product documentation.
- Modify `README.md`: add Phase 19 module note.

## Task 1: Documentation

- [ ] Create the Phase 19 design document at `docs/superpowers/specs/2026-05-20-phase-19-parts-inventory-design.md`.
- [ ] Create this implementation plan at `docs/superpowers/plans/2026-05-20-phase-19-parts-inventory.md`.
- [ ] Commit the docs with:

```bash
git add docs/superpowers/specs/2026-05-20-phase-19-parts-inventory-design.md docs/superpowers/plans/2026-05-20-phase-19-parts-inventory.md
git commit -m "docs: plan phase 19 parts inventory"
```

## Task 2: Database, RLS, and pgTAP

- [ ] Run `npx supabase migration new phase_19_parts_inventory`.
- [ ] Add enums: `part_status`, `part_stock_status`, `part_order_status`, `part_transfer_status`, `part_receipt_status`, `service_part_line_status`, `part_reorder_alert_status`.
- [ ] Seed module `parts` and package access for `showroom_pro`, `export_business`, and `enterprise_dealer_group`.
- [ ] Seed permissions: `view_parts`, `manage_parts`, `manage_part_orders`, `transfer_parts`.
- [ ] Add tables: `part_suppliers`, `parts`, `part_stock`, `part_purchase_orders`, `part_purchase_order_items`, `part_receipts`, `part_receipt_items`, `part_transfers`, `service_parts_lines`, `part_reorder_alerts`.
- [ ] Add triggers to calculate line totals, purchase order totals, stock availability, receipt stock increases, service parts stock decreases, reorder alerts, and service order totals.
- [ ] Grant authenticated access and enable RLS on all parts tables.
- [ ] Add RLS policies that require parts permissions and branch access.
- [ ] Add seed supplier, parts, stock, and reorder alert data for dev companies.
- [ ] Create `supabase/tests/phase_19_parts_inventory.sql` covering tenant isolation, receiving stock, service part consumption, and service total refresh.

## Task 3: Business Logic and Validation

- [ ] Write failing unit tests in `tests/unit/parts.test.ts` for:
  - stock status calculation,
  - service part line totals,
  - purchase order totals,
  - reorder alert status,
  - Zod normalization.
- [ ] Run `npm run test -- tests/unit/parts.test.ts` and confirm it fails because code is missing.
- [ ] Implement `lib/parts/calculations.ts`, `lib/parts/format.ts`, and `lib/validations/parts.ts`.
- [ ] Run `npm run test -- tests/unit/parts.test.ts` and confirm it passes.

## Task 4: Backend Actions and Queries

- [ ] Create `features/parts/queries.ts` with typed reads for suppliers, parts, stock, purchase orders, receipt history, transfers, service parts, reorder alerts, service orders, service jobs, and branches.
- [ ] Create `features/parts/actions.ts` with server actions for supplier, part, purchase order, purchase order item, receipt, transfer, and service part line creation.
- [ ] Enforce `view_parts`, `manage_parts`, `manage_part_orders`, `transfer_parts`, and `manage_service` where appropriate.
- [ ] Write audit logs for purchase order, receipt, transfer, and service part usage actions.
- [ ] Revalidate `/parts/inventory` after successful mutations.

## Task 5: UI

- [ ] Add `parts` permission constants in `lib/permissions/permissions.ts`.
- [ ] Add the sidebar module in `lib/modules/module-registry.ts`.
- [ ] Create `app/(app)/parts/inventory/page.tsx`.
- [ ] Create `app/(app)/parts/inventory/parts-action-forms.tsx`.
- [ ] Build KPI cards, tables, status badges, and client-enhanced forms with visible success/error feedback.
- [ ] Keep text compact and dashboard-oriented for daily dealership operations.

## Task 6: E2E and Docs

- [ ] Add `/parts/inventory` to protected route checks.
- [ ] Extend the main E2E workflow to create a supplier, catalog part, purchase order, purchase order item, receipt, transfer, and service part line.
- [ ] Create `docs/phase-19-parts-inventory.md`.
- [ ] Update `README.md`.

## Task 7: Verification and Commit

- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `npx supabase db reset`.
- [ ] Run `npx supabase test db`.
- [ ] Run `npm run test:e2e`.
- [ ] Commit implementation with:

```bash
git add .
git commit -m "feat: add parts inventory phase"
```
