# Phase 16: F&I / Deal Desk Design

## Goal

Add a dealership-grade finance and insurance deal desk to AutoSphere ERP. The module should structure cash, finance, and lease deals; calculate payments; track add-on products; submit finance applications to lenders in an integration-ready way; and support manager approval before final contract/funding.

## Scope

- Deal desk module under Sales.
- Cash, finance, and lease deal records.
- Installment calculation business logic.
- Deal add-on products for insurance, warranty, service contract, and other F&I products.
- Lender registry and lender submission architecture.
- Finance application records linked to deals.
- Deal approval workflow.
- UI for deal creation, deal list, lender/products panels, and submission/approval state.
- Supabase RLS and pgTAP tests.

## Data Model

New tables:
- `deals`
- `deal_products`
- `finance_applications`
- `lenders`
- `lender_submissions`
- `insurance_products`
- `warranty_products`
- `deal_approvals`

Core permissions:
- `view_deals`
- `manage_deals`
- `approve_deals`

## Security

- All F&I tables include `company_id`.
- Branch-scoped records also validate `branch_id`.
- Select requires `view_deals` or `manage_deals`.
- Mutations require `manage_deals`.
- Approval updates require `approve_deals`.
- Sensitive actions write audit logs.

## Business Rules

- Finance amount equals vehicle price plus selected products minus down payment and trade-in value.
- Monthly payment uses standard amortization for non-zero interest and straight division for zero-interest finance.
- Finance application amount and term should mirror the deal at creation time.
- Lender submissions are architecture-ready and stored as manual/API-ready records; no live lender API call is made yet.
- Deal approval status controls whether a deal is ready for contract/funding.

## Package Access

Add `deal_desk` as a package module enabled for:
- Showroom Pro
- Export Business
- Enterprise Dealer Group

Starter users see the module locked through existing sidebar behavior.
