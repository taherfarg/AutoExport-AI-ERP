# Phase 5 Import/Export Operations Design

## Goal

Phase 5 adds the production import/export operations layer for AutoSphere ERP. It connects sold/reserved vehicles and customers to export orders, import orders, logistics partners, shipping events, customs clearance, export documents, and shipment costs.

## Scope

This phase builds:

- Tenant-isolated import/export database tables.
- Destination countries and logistics partner master data.
- Export orders linked to customers, vehicles, sales invoices, and proformas.
- Import orders for inbound vehicle purchases.
- Shipping events and tracking statuses.
- Customs clearance records.
- Export document status records and missing document alerts placeholder.
- Shipment cost records.
- Export permissions and RLS.
- `/export/orders` dashboard/list page with KPIs, filters, and create-export-order form.
- `/export/orders/[exportOrderId]` detail page with shipping, customs, documents, costs, and action forms.
- Unit, pgTAP, and E2E coverage.

Out of scope for this phase:

- Real carrier API integration.
- Customs broker API integration.
- PDF/export document generation.
- Automated WhatsApp/email notifications.
- Full landed-cost accounting into Finance Lite; this phase records shipment costs and prepares the data for Phase 6.

## Data Model

The schema adds:

- `destination_countries`: supported export/import countries and common ports.
- `logistics_partners`: shipping lines, freight forwarders, transporters, and customs brokers.
- `export_orders`: customer/vehicle shipment orders with destination, port, booking, container, BL, customs, payment, and document status.
- `import_orders`: inbound procurement/import workflow records.
- `shipping_events`: chronological shipment tracking events.
- `customs_clearance`: customs workflow status, broker, declarations, and inspection dates.
- `export_documents`: export-specific document checklist/status records.
- `shipment_costs`: freight, port fees, customs, insurance, inspection, and handling costs.

All operational rows include `company_id`, `branch_id` where applicable, user audit fields, timestamps, and `deleted_at` for soft archive where useful.

## Permission Model

Phase 5 uses existing `manage_exports` and adds:

- `view_exports`
- `update_export_status`
- `manage_logistics_partners`

Company owners receive the new permissions automatically. Export managers need `view_exports` to read import/export records, `manage_exports` to create orders and documents, `update_export_status` to add shipping/customs events, and `manage_logistics_partners` to maintain partner master data.

## Business Rules

- Export orders are tenant-scoped and branch-scoped.
- Export orders can be linked to a sold or reserved vehicle, but should not cross company boundaries.
- Every export order can track shipping status, customs status, payment status, and document status independently.
- Shipping events are append-only timeline rows.
- Customs clearance stores the latest operational customs state.
- Export documents can be marked missing, pending, uploaded, verified, or expired.
- Missing required export documents surface as dashboard counts and detail-page warnings.
- Shipment costs roll up by export order.

## UX

The export orders dashboard supports export operations staff:

- KPI cards for active orders, in transit, under clearance, delayed/missing documents, and shipment cost total.
- Search and filters by shipping status, customs status, destination country, and branch.
- Export order table with buyer, vehicle, destination, shipping status, customs status, documents, ETD/ETA, and payment status.
- Create-export-order form using visible vehicles/customers/invoices and logistics partners.

The export order detail page shows:

- Order overview and status cards.
- Shipping timeline.
- Customs clearance panel.
- Export document checklist.
- Shipment cost ledger.
- Forms to add shipping events, update customs clearance, add documents, and add shipment costs.

## Testing

Phase 5 requires:

- pgTAP tests for RLS, destination seeds, export order tenant isolation, and shipment cost rollups.
- Unit tests for export status labels, delayed-shipment detection, missing-document counts, and cost totals.
- E2E coverage for creating an export order, adding a shipping event, updating customs, adding an export document, and recording a shipment cost.

