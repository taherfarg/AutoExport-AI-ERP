# Supplier Accounting Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add a shared DMS supplier/vendor layer and improve the accounting experience with supplier balances, AP aging, and professional supplier management.

**Architecture:** Supabase owns the canonical suppliers table and links it to finance expenses/payables and parts purchase orders. Next.js server actions validate and audit supplier mutations. UI adds /finance/suppliers, improves /finance/accounting, and fixes sidebar parent/child active state.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind/shadcn-style components, Supabase Postgres/RLS, pgTAP, Vitest, Playwright.

---

### Task 1: Database, RLS, and Seed

**Files:**
- Create: supabase/migrations/<timestamp>_phase_22_supplier_accounting_upgrade.sql
- Create: supabase/tests/phase_22_supplier_accounting_upgrade.sql

- [ ] Add supplier enums/table with tenant fields, category, tax/payment/bank fields, RLS, indexes, grants, audit compatibility.
- [ ] Add nullable supplier_id to expenses, payables, and part_purchase_orders with composite company FKs.
- [ ] Backfill suppliers from part_suppliers, expenses.supplier_name, and payables.supplier_name.
- [ ] Seed module suppliers and permission manage_suppliers into finance/accounting roles.
- [ ] Add pgTAP checks for table existence, RLS, permission seed, backfill/link columns, and tenant isolation.

### Task 2: Domain Layer

**Files:**
- Create: lib/suppliers/calculations.ts
- Create: lib/suppliers/format.ts
- Create: lib/validations/suppliers.ts
- Create: eatures/suppliers/queries.ts
- Create: eatures/suppliers/actions.ts
- Test: 	ests/unit/suppliers.test.ts

- [ ] Write failing tests for supplier balance/AP aging/category formatting/validation.
- [ ] Implement supplier calculations and validation.
- [ ] Implement supplier dashboard query joining payables, expenses, parts POs, and documents-ready metadata.
- [ ] Implement create/update supplier and supplier-linked payable action with permission checks and audit logs.

### Task 3: UI and Navigation

**Files:**
- Modify: lib/permissions/permissions.ts
- Modify: lib/modules/module-registry.ts
- Modify: components/app-shell/app-sidebar.tsx
- Create: pp/(app)/finance/suppliers/page.tsx
- Create: pp/(app)/finance/suppliers/supplier-action-forms.tsx
- Modify: pp/(app)/finance/accounting/page.tsx
- Modify: pp/(app)/finance/finance-action-forms.tsx
- Modify: pp/(app)/parts/inventory/parts-action-forms.tsx

- [ ] Add Suppliers navigation under finance.
- [ ] Fix active sidebar so parent and child cannot both show active dots.
- [ ] Build supplier page with KPI cards, supplier table, AP aging, linked payables/expenses/POs, and create forms.
- [ ] Add supplier select to finance payable/expense and parts purchase order forms.
- [ ] Add supplier/AP summary widgets to accounting dashboard.

### Task 4: Verification

**Files:**
- Modify: 	ests/e2e/auth-workspace.spec.ts
- Modify: README.md
- Create: docs/phase-22-supplier-accounting-upgrade.md

- [ ] Extend E2E route coverage for /finance/suppliers and supplier creation/payable link.
- [ ] Run 
pm run test, 
px tsc --noEmit, 
pm run lint, 
pm run build, 
px supabase test db, and 
pm run test:e2e.
- [ ] Commit docs and implementation.
