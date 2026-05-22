# Phase 22: Supplier Accounting Upgrade

Phase 22 turns supplier data into a shared DMS master record instead of isolated text fields.

## Implemented

- Shared `suppliers` table for parts, vehicle suppliers, logistics, service, marketing, finance, and general vendors.
- Supplier RLS, permissions, package module access, indexes, and audit-ready tenant fields.
- Links from finance expenses and payables to supplier master records.
- Parts purchase orders now also reference the shared supplier master through the existing supplier ID.
- Backfill from parts suppliers, payables, and expenses into shared supplier records.
- Supplier dashboard at `/finance/suppliers`.
- Supplier AP aging, open PO value, risk badges, and recent payable views.
- Finance payable and expense forms can use supplier master records or manual supplier text.
- Accounting dashboard includes supplier AP, aging, PO exposure, and supplier review table.
- Sidebar active-state fix prevents parent and child modules from both showing active dots.

## Current Limits

- Supplier document linking is ready through IDs, but document UI filters remain part of the central Documents page.
- External supplier EDI/payment integrations are still architecture placeholders.
- Automated journal posting from every supplier payable remains a future accounting automation layer.
