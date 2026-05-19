# Phase 3A CRM Leads Core Design

## Goal

Phase 3A adds the first real CRM layer for AutoSphere ERP: customers, leads, follow-ups, lead messages, opportunities, and a pipeline view. It is scoped to production CRM foundations, not the later sales document workflow.

## Scope

This phase builds:

- Tenant-isolated CRM database tables.
- CRM permissions and role assignment for existing company owner roles.
- Lead and customer seed data for GCC/global automotive trading scenarios.
- RLS policies for company, branch, and assigned-salesperson access.
- Server-side validations, queries, and actions.
- `/crm/leads` list/pipeline page with KPIs, filters, lead creation, and follow-up creation.
- `/crm/leads/[leadId]` detail page with lead profile, activity, follow-ups, messages, and matching available vehicles.
- SQL, unit, and E2E test coverage for key behavior.

Out of scope for this phase:

- Quotations, reservations, invoices, payments, and proformas.
- AI lead scoring beyond a stored score field and matching-vehicle query.
- Calendar integrations and external messaging APIs.

## Data Model

The schema adds CRM-specific enums and tables:

- `customers`: customer master records that can be individual buyers, dealers, companies, or export buyers.
- `leads`: active sales opportunities with source, status, budget, assignment, preferred vehicle criteria, and next follow-up.
- `lead_messages`: inbound/outbound communication log.
- `follow_ups`: actionable reminders linked to leads and optionally customers.
- `opportunities`: lightweight pipeline records for lead value and probability.
- `customer_notes`: internal customer timeline notes.

All business rows include `company_id`, `branch_id` where operationally relevant, `created_by`, `updated_by`, timestamps, and `deleted_at` for soft delete.

## Permission Model

New CRM permissions:

- `view_customers`
- `create_customer`
- `update_customer`
- `view_leads`
- `view_all_leads`
- `create_lead`
- `update_lead`
- `assign_lead`
- `create_follow_up`
- `update_follow_up`

Company owners receive these permissions automatically. Onboarding after this migration also receives them because the company setup flow assigns all current permissions to the owner role.

Lead visibility is permission-aware:

- Users with `view_all_leads`, `manage_users`, or `manage_company_settings` can view all company leads in accessible branches.
- Salespeople with `view_leads` can view leads assigned to them, or leads they created, in accessible branches.
- Follow-ups follow lead visibility, plus direct access for the assigned follow-up owner.

## UX

The lead list is an operational CRM desk:

- KPI cards for total leads, hot leads, due today, overdue, and pipeline value.
- Search and filters by status, branch, source, and salesperson.
- Table rows optimized for scanning lead identity, interest, assignment, follow-up urgency, and value.
- Pipeline columns by status for quick deal-state visibility.
- Creation form for a real lead record with branch, assignment, source, budget, and preferences.

The lead detail page provides:

- Lead identity and status actions.
- Customer requirements and assignment.
- Follow-up creation.
- Message logging.
- Timeline sections for messages and follow-ups.
- Matching vehicle suggestions from current available stock using brand/model preferences.

## Business Rules

- Lead and customer data must never cross companies.
- Branch users only see accessible branch records unless they have company-wide management permissions.
- Salesperson-scoped users see their own assigned or created leads.
- Follow-up due dates drive due-today and overdue KPIs.
- A converted lead can create or link a customer record.
- Lead messages update the lead `last_contact_at`.
- New follow-ups update the lead `next_follow_up_at`.

## Testing

Phase 3A requires:

- SQL tests confirming CRM tables have RLS and tenant isolation works.
- Unit tests for CRM formatting/stat helpers.
- E2E coverage for creating a workspace, branch, lead, follow-up, and message.

