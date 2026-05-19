# Phase 4 Sales Transactions Design

## Goal

Phase 4 adds the first production sales transaction layer for AutoSphere ERP: quotations, reservations, proforma invoices, sales invoices, and payments. This phase connects CRM leads, customers, vehicles, and money movement without attempting full accounting.

## Scope

This phase builds:

- Tenant-isolated sales tables for quotations, quotation items, reservations, proformas, proforma items, sales invoices, invoice items, and payments.
- Sales permissions and owner role assignment.
- Business rules for totals, deposits, balances, reservation holds, invoice payment totals, and vehicle status transitions.
- Sales seed data linked to existing global/GCC vehicles and CRM customers.
- RLS policies for company, branch, and permission-aware access.
- Server-side validation, queries, and actions.
- `/sales/quotations` page for the sales desk and quotation creation.
- `/sales/quotations/[quotationId]` detail page with quotation HTML preview and actions to create reservation, proforma, invoice, and payment.
- `/sales/invoices` page for invoice and payment monitoring.
- SQL, unit, and E2E test coverage.

Out of scope for this phase:

- PDF generation and branded document export.
- Stripe or online payment gateway capture.
- Full accounting journals.
- Export order creation from proforma; that belongs to Phase 5.

## Data Model

The schema adds:

- `quotations`: customer-facing offers tied to branch, customer/lead, vehicle, salesperson, totals, validity, and status.
- `quotation_items`: line items for vehicle price, shipping estimates, and fees.
- `reservations`: vehicle holds with deposit, expiry, payment status, and signature status.
- `proforma_invoices`: export-ready invoice drafts with destination, payment terms, and totals.
- `proforma_invoice_items`: proforma lines.
- `sales_invoices`: final payable invoices with paid amount and balance due.
- `sales_invoice_items`: final invoice lines.
- `payments`: deposits, partial payments, final payments, and refunds linked to invoices and vehicles.

All business tables include `company_id`, `branch_id`, audit columns, timestamps, and `deleted_at` where records can be archived.

## Business Rules

- Quotation totals are calculated from price, discount, and tax.
- Quotation items can be saved for clean HTML document previews.
- Creating a reservation from a quotation updates the vehicle status to `reserved`.
- Reserved or sold vehicles cannot be reserved again.
- Creating a sales invoice from a quotation or proforma stores the final amount and initial balance.
- Recording a payment updates the related invoice `paid_amount`, `balance_due`, and invoice status.
- Fully paid sales invoices mark the vehicle `sold`.
- Payment recording is permission-controlled and audited through the sales tables plus existing user/action metadata.

## Permission Model

Existing sales permissions are used:

- `create_quotation`
- `approve_discount`
- `reserve_vehicle`
- `create_invoice`
- `record_payment`

Additional read/update permissions are added:

- `view_sales`
- `update_quotation`
- `view_payments`

Company owners receive these automatically. Sales users need `view_sales` to read documents, `create_quotation` to create quotes, `reserve_vehicle` to reserve, `create_invoice` to create proformas/final invoices, and `record_payment` to record payments.

## UX

The sales desk is a compact operational screen:

- KPI cards for quotations, reserved value, invoices, paid amount, and balance due.
- Search/filter by status, branch, and salesperson.
- Sales document table with buyer, vehicle, status, amount, and dates.
- Quote creation form that links branch, lead/customer, vehicle, salesperson, price, discount, tax, and validity.

The quotation detail page:

- Shows document identity and status.
- Displays a clean HTML quotation preview.
- Provides action panels for reservation, proforma, invoice, and payment recording.
- Shows related reservation, proforma, invoice, and payment history.

The invoices page:

- Lists final invoices, payment status, paid amount, and balance due.
- Surfaces overdue/pending payment monitoring.

## Testing

Phase 4 requires:

- pgTAP tests for RLS, calculations, reservation status transition, and payment balance updates.
- Unit tests for sales total and payment status helpers.
- E2E coverage for creating a lead-backed quotation, reservation, invoice, and payment.

