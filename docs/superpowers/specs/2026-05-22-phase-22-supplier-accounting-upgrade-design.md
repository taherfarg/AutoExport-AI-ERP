# Phase 22 Supplier Accounting Upgrade Design

## Goal

Add a professional shared supplier/vendor layer that connects accounting, Finance Lite, parts purchasing, AP aging, and OCR supplier invoice workflows.

## Architecture

Supabase owns `suppliers` as the canonical company-scoped supplier master. Existing parts suppliers are retained for compatibility, but their IDs are mirrored into `suppliers` so parts purchase orders can be analyzed by the shared supplier dashboard. Finance expenses and payables receive nullable `supplier_id` links while preserving existing `supplier_name` text for historical data and manual entry.

## UI

Add `/finance/suppliers` with supplier KPIs, supplier table, AP aging, recent payables, parts purchase links, and create forms. Upgrade `/finance/accounting` with supplier AP and aging cards. Finance forms get supplier selectors while still allowing manual supplier names.

## Security

Supplier reads are available to finance, accounting, parts, and export users. Supplier mutations require `manage_suppliers` or existing manager-level finance/accounting/parts permissions. All supplier table access is protected by RLS and all server mutations create audit logs.

## Testing

Vitest covers supplier calculations and validation. pgTAP covers schema, RLS, permissions, tenant isolation, and payable linking. Playwright covers supplier route protection, supplier creation, and supplier-linked payable creation.
