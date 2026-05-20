# Phase 19: Parts Inventory

Phase 19 adds production parts inventory workflows to AutoSphere ERP.

## Implemented

- Parts Inventory module at `/parts/inventory`.
- Parts catalog with part number, SKU, category, brand, cost, selling price, currency, and reorder rules.
- Branch stock with on-hand, reserved, available, average cost, and stock status.
- Parts suppliers.
- Supplier purchase orders and purchase order items.
- Posted receipts that increase branch stock.
- Branch-to-branch parts transfers.
- Service parts usage linked to service orders and jobs.
- Service order parts totals refresh from used service parts.
- Reorder alerts from low branch availability.
- Parts profitability per service part line.
- Supabase RLS and server-side permission checks.
- pgTAP, Vitest, and Playwright coverage.

## Permissions

- `view_parts`
- `manage_parts`
- `manage_part_orders`
- `transfer_parts`

Company owners, general managers, branch managers, inventory managers, and super admins receive the permissions by default.

## Database Objects

- `part_suppliers`
- `parts`
- `part_stock`
- `part_purchase_orders`
- `part_purchase_order_items`
- `part_receipts`
- `part_receipt_items`
- `part_transfers`
- `service_parts_lines`
- `part_reorder_alerts`

## Current Limitations

- OEM catalog lookup, barcode scanning, and supplier EDI are integration-ready future work.
- Inventory accounting journal postings remain a later bridge into the Phase 17 accounting module.
- Transfer workflow records immediate received transfers in this phase.
