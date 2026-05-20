# Phase 18: Service / Workshop Design

Phase 18 adds a dealership service department layer to AutoSphere ERP. It supports repair orders, job cards, technician assignment, labor lines, inspection checklists, vehicle health checks, warranty claims, service appointments, and service history for vehicles and customers.

## Goals

- Add service/workshop as a package-gated module.
- Track service orders from appointment to completed repair order.
- Assign jobs to technicians and monitor job progress.
- Capture labor lines and service profitability.
- Add reusable inspection checklists and inspection results.
- Add warranty claim records linked to vehicles/customers/service orders.
- Add service appointments for booking and follow-up.
- Expose a production UI under `/service/workshop`.
- Enforce RLS and server-side service permissions.

## Non-Goals

- Parts inventory consumption; that is Phase 19.
- OEM warranty API integration.
- Technician mobile app.
- Workshop bay scheduling optimization.

## Data Model

New tables:

- `technicians`
- `service_orders`
- `service_jobs`
- `service_labor_lines`
- `inspection_checklists`
- `inspection_results`
- `warranty_claims`
- `service_appointments`

Every table includes `company_id`, audit columns, timestamps, and soft delete where needed. Branch-scoped tables include `branch_id`.

## Workflow

1. Create service appointment.
2. Create service order for a vehicle/customer.
3. Add service job cards.
4. Assign technician.
5. Add labor lines.
6. Complete inspection checklist.
7. Add warranty claim when needed.
8. Complete service order and preserve vehicle/customer service history.

## Permissions

New permissions:

- `view_service`
- `manage_service`
- `assign_service_jobs`
- `manage_warranty_claims`

Service managers and general managers can manage service. Technicians can be assigned later through role configuration.

## UI

Route: `/service/workshop`

Sections:

- Service KPI cards
- Service orders table
- Job cards table
- Technician roster
- Labor ledger
- Inspection results
- Warranty claims
- Appointment calendar list
- Create forms for order, job, labor, inspection, claim, technician, and appointment

## Testing

- Unit tests cover service totals, job duration, inspection score, and warranty claim balance.
- pgTAP tests cover RLS, permissions, tenant isolation, service order/job creation, and status updates.
- Playwright extends the main workflow to create a technician, appointment, service order, job, labor line, inspection result, and warranty claim.

## Security Notes

- RLS is enabled on all public service tables.
- Branch-scoped records use the existing branch access helper.
- Server actions validate all input with Zod and write audit logs for mutations.
- Warranty financial amounts are only exposed to users with service access in this phase; accounting integration comes later.
