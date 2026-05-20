# Phase 19: Parts Inventory Design

Phase 19 adds dealership parts operations to AutoSphere ERP. It connects the service workshop to a real parts catalog, branch stock, supplier purchasing, receiving, stock transfers, service-order consumption, reorder alerts, and parts profitability.

## Goals

- Add parts inventory as a package-gated module.
- Maintain a company-level parts catalog with unique part numbers and SKUs.
- Track stock by branch with on-hand, reserved, and available quantities.
- Manage parts suppliers and supplier purchase orders.
- Receive parts into branch stock and update purchase order received quantities.
- Transfer parts between branches with auditable transfer records.
- Consume parts on service orders and refresh service order parts totals.
- Surface low-stock and out-of-stock reorder alerts.
- Track service parts gross profit from cost and selling price.
- Enforce Supabase RLS, server-side permissions, and audit logs.

## Non-Goals

- OEM parts catalog integration.
- Barcode scanner workflow.
- Warehouse bin optimization.
- Automated supplier EDI ordering.
- Full accounting inventory valuation postings. Accounting export hooks can be added later.

## Data Model

New tables:

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

Every table includes `company_id`, audit columns, timestamps, and soft delete where relevant. Branch-operational records include `branch_id` or explicit source/destination branch columns.

## Workflow

1. Create parts supplier.
2. Create or update catalog part.
3. Create supplier purchase order and line item.
4. Receive parts into a branch.
5. Stock availability is recalculated.
6. Transfer stock between branches when needed.
7. Add parts to a service order.
8. Service order parts total and total amount are refreshed.
9. Low stock creates reorder alert records for manager action.

## Permissions

New permissions:

- `view_parts`
- `manage_parts`
- `manage_part_orders`
- `transfer_parts`

Inventory managers, branch managers, general managers, company owners, and super admins receive these permissions by default.

## UI

Route: `/parts/inventory`

Sections:

- Parts KPI cards
- Parts catalog
- Branch stock
- Suppliers
- Purchase orders and items
- Receipts
- Branch transfers
- Service parts usage
- Reorder alerts
- Action forms for catalog, supplier, purchasing, receiving, transfer, and service consumption

## Service Integration

`service_parts_lines` links to Phase 18 service orders and jobs. When used parts are added, the system:

- calculates line cost, line total, and gross profit,
- decrements branch stock,
- refreshes `service_orders.parts_total`,
- refreshes `service_orders.total_amount`.

## Testing

- Unit tests cover parts line totals, purchase order totals, stock status, reorder status, and profitability.
- pgTAP tests cover RLS, permissions, tenant isolation, receiving stock, service parts consumption, and service order total refresh.
- Playwright extends the production workflow with supplier, part, purchase order, receipt, transfer, and service part usage creation.

## Security Notes

- RLS is enabled on every public parts table.
- Branch-scoped access uses the existing branch access helper.
- Server actions validate all inputs with Zod.
- Service-role queries always filter by `company_id`.
- Parts receiving, transfers, and service consumption write audit logs.
