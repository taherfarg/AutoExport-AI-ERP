# Phase 2A Vehicle Inventory Core Design

Date: 2026-05-18
Status: Approved
Product: AutoSphere ERP

## Goal

Build the first production vehicle inventory vertical slice: tenant-secure vehicle records, costing, status history, branch movement history, pricing history, inventory list UI, vehicle detail UI, and tests.

## Scope

Phase 2A includes:

- Vehicle inventory schema and RLS policies.
- Vehicle costing and profit calculations.
- Vehicle list with search and filters.
- Add vehicle form.
- Vehicle detail page with overview, specifications, costing, document/photo readiness placeholders, status timeline, and branch movement history.
- Server actions for create, update, archive, branch move, and status changes.
- Seed data with global and GCC vehicles.
- SQL tests for tenant isolation and core business constraints.
- Unit tests for pricing calculations.

Phase 2A does not include binary file upload, sales reservations, CRM lead interest, invoices, or AI pricing recommendations. Those get implemented in their own phases, but this phase creates the storage-ready metadata tables and interface anchors.

## Data Model

Tables:

- `vehicles`
- `vehicle_costs`
- `vehicle_photos`
- `vehicle_documents`
- `vehicle_status_history`
- `vehicle_branch_movements`
- `vehicle_price_history`

Every tenant table includes `company_id`, `created_by`, `updated_by`, timestamps, and `deleted_at` where the record is business-owned. Branch-scoped records use composite foreign keys so a `branch_id` must belong to the same `company_id`.

Vehicle uniqueness is per company:

- `stock_number`
- `vin`

Vehicle status values:

- `available`
- `reserved`
- `sold`
- `in_transit`
- `under_customs_clearance`
- `under_preparation`
- `ready_for_export`
- `delivered`
- `cancelled`

## Authorization

RLS uses existing Phase 1 private helper functions:

- `app_private.is_company_member(company_id)`
- `app_private.can_access_branch(company_id, branch_id)`
- `app_private.has_company_permission(company_id, permission_key)`

Rules:

- Viewing vehicles requires active company membership, branch access, and `view_vehicles`.
- Creating vehicles requires `create_vehicle`.
- Updating vehicles requires `update_vehicle`.
- Archiving vehicles requires `delete_vehicle`.
- Cost and profit records require `view_vehicle_cost` and `view_vehicle_profit`.
- Branch movement requires `update_vehicle`.
- Status changes require `update_vehicle`, except reservation flows later require `reserve_vehicle`.

## Business Logic

The application calculates:

- `total_landed_cost = purchase_price + shipping_cost + customs_cost + preparation_cost + marketing_cost + other_expenses`
- `expected_profit = selling_price - total_landed_cost`
- `profit_margin = expected_profit / selling_price * 100`

Changing status creates `vehicle_status_history`.
Moving branch creates `vehicle_branch_movements`.
Changing selling price creates `vehicle_price_history`.

Reserved vehicles cannot be reserved again. Sold vehicles are protected by permissions and will be handled by server-side checks before updates.

## UI

Inventory list:

- Page title and primary add action.
- KPI strip for total stock, available, reserved, sold, in transit, and inventory value.
- Search by stock number, VIN, brand, model, and trim.
- Filters by status, branch, brand, export availability.
- Dense table optimized for showroom operators.
- Empty state with an add action.

Vehicle detail:

- Strong identity header: stock number, year, brand, model, trim, status.
- Action buttons for edit, move branch, status update, and archive.
- Overview cards for landed cost, selling price, expected profit, margin, days in stock, document readiness, and export readiness.
- Sections for specifications, cost breakdown, photos metadata, document checklist metadata, status timeline, and branch movements.

## Testing

Verification must include:

- `npm run lint`
- `npm run test`
- `npx tsc --noEmit`
- `npm run build`
- `npx supabase db reset`
- `npx supabase test db`
- `npm run test:e2e`

SQL tests must prove:

- RLS is enabled on all Phase 2A public tables.
- A tenant cannot read another tenant's vehicles.
- VIN and stock number uniqueness are company-scoped.
- Vehicle costs calculate correctly.

