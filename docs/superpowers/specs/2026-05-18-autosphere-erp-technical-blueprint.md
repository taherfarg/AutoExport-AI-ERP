# AutoSphere ERP Technical Blueprint

Date: 2026-05-18
Status: Draft for review
Product: White-label Automotive SaaS ERP
Source charter: `docs/MASTER_BUILD_PROMPT.md`

## 1. Product Direction

AutoSphere ERP is a subscription-based, white-label SaaS platform for car showrooms, dealers, brokers, import/export companies, and multi-branch automotive groups. The platform must work globally from day one while shipping with strong GCC defaults for Arabic/English, RTL layout, AED and GCC currencies, VAT-ready invoices, ports, customs workflows, and export documentation.

This must be built as the actual production system, not a prototype. Every phase must include real database schema, backend logic, RLS policies, frontend UI, validated forms, server actions or API paths, tests where risk justifies them, and documentation updates.

The product will be built step by step. The first technical goal is not to build all modules at once, but to create a secure SaaS foundation that can support inventory, CRM, sales, export, finance, documents, marketing, reporting, and AI automation over time.

## 2. Architecture Decision

Recommended stack:

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, Recharts, React Hook Form, Zod, TanStack Table, TanStack Query where useful
- Backend platform: Supabase
- Database: PostgreSQL
- Auth: Supabase Auth
- Storage: Supabase Storage
- Authorization: PostgreSQL Row Level Security
- Background work: Supabase Edge Functions and scheduled jobs
- AI layer: server-side AI routes or Edge Functions with audit logging and permission checks
- Payments: Stripe-ready first, with local payment gateway architecture later
- Deployment: Vercel frontend, Supabase backend, separate dev/staging/production environments

The system will use one shared Supabase/PostgreSQL database for all standard tenants. Each business row will include `company_id`, and RLS policies will ensure users can only access rows for companies where they are active members. For very large enterprise clients, the product can later support isolated deployments using a separate Supabase project or dedicated infrastructure.

This gives the fastest path to a real SaaS MVP while preserving a future enterprise isolation option.

## 3. Tenancy Model

Primary tenant object:

- `companies`: a dealership, showroom, broker, exporter, or dealer group workspace.

Company structure:

- A company can have many branches.
- A company can have many users.
- A user can belong to more than one company through memberships.
- A user can have different roles per company and optionally per branch.
- Most business data belongs to exactly one company.
- Branch-specific records include `branch_id`.

Core membership model:

- `profiles` links Supabase Auth users to app-level user data.
- `company_memberships` links users to companies.
- `branch_memberships` optionally limits branch access.
- `roles` define reusable permission groups.
- `permissions` define atomic actions.
- `role_permissions` maps roles to permissions.

Tenant isolation rule:

Every business table must include:

- `id`
- `company_id`
- `branch_id` where needed
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `deleted_at`

RLS policy pattern:

- A user may select rows where `company_id` is in their active `company_memberships`.
- Inserts must check that the inserted `company_id` is one of the user's active companies.
- Updates and deletes require both company membership and the required permission.
- Branch-limited users must only access rows in allowed branches unless their role grants company-wide access.

Authorization data must live in database tables and trusted app metadata, not editable user metadata.

## 4. Global and GCC Localization

Global support:

- Multi-country company settings
- Multi-currency vehicle costs, listings, invoices, payments, and reports
- Country-specific tax settings
- Country-specific document checklist templates
- Country, port, customs, and shipping configuration
- Language-ready interface

GCC defaults:

- Arabic and English interface support
- RTL layout support for Arabic
- AED, SAR, OMR, QAR, BHD, KWD defaults
- VAT-ready invoice fields
- GCC country and port presets
- Export document templates for common regional workflows
- Customer, company, and invoice fields suitable for GCC trading

Recommended localization tables:

- `countries`
- `currencies`
- `tax_profiles`
- `company_tax_settings`
- `ports`
- `customs_statuses`
- `document_templates`
- `document_checklist_templates`
- `translations` or application-level i18n files

## 5. Subscription and Module Gating

Subscription packages:

- Starter
- Showroom Pro
- Export Business
- Enterprise Dealer Group

Core tables:

- `packages`
- `modules`
- `package_modules`
- `subscriptions`
- `subscription_usage_limits`
- `company_usage_counters`

Gating rules:

- Sidebar modules are shown or hidden based on package access.
- Protected routes check both authentication and module entitlement.
- Actions check permissions and package limits.
- Usage limits can restrict branches, users, vehicles, listings, AI requests, storage usage, and export orders.
- Billing provider integration can be added later without changing the core subscription model.

## 6. Module Map

Foundation modules:

- Auth
- Companies
- Branches
- Users
- Roles and permissions
- Subscriptions
- Settings
- Audit logs
- Notifications

Operational modules:

- Dashboard
- Vehicle inventory
- Vehicle details
- Global stock
- CRM
- Leads and follow-ups
- Customers
- Quotations
- Reservations
- Proforma invoices
- Sales invoices
- Payments
- Import and export
- Shipping tracking
- Customs clearance
- Documents
- Digital signature
- Smart vehicle pricing
- Finance Lite
- Marketing and listings
- Social media generator
- Smart alerts
- Reports
- Chat center
- AI technical intelligence

The app should be implemented as a modular monolith first. Modules share one database and one Next.js app, but each module owns its route group, components, server actions, data access functions, validation schemas, and tests.

## 7. Database Schema Groups

### 7.1 Platform Core

- `companies`
- `branches`
- `profiles`
- `company_memberships`
- `branch_memberships`
- `roles`
- `permissions`
- `role_permissions`
- `user_role_assignments`
- `packages`
- `modules`
- `package_modules`
- `subscriptions`
- `company_settings`
- `audit_logs`
- `notifications`

### 7.2 Vehicle Inventory

- `vehicles`
- `vehicle_costs`
- `vehicle_photos`
- `vehicle_documents`
- `vehicle_status_events`
- `vehicle_branch_movements`
- `vehicle_price_recommendations`
- `vehicle_document_checklists`

### 7.3 CRM and Sales

- `customers`
- `leads`
- `lead_interests`
- `follow_ups`
- `opportunities`
- `quotations`
- `quotation_items`
- `reservations`
- `proforma_invoices`
- `proforma_invoice_items`
- `sales_invoices`
- `sales_invoice_items`
- `payments`

### 7.4 Import and Export

- `export_orders`
- `import_orders`
- `shipping_events`
- `shipping_companies`
- `logistics_partners`
- `destination_countries`
- `ports`
- `customs_clearance_records`
- `export_documents`

### 7.5 Finance Lite

- `vehicle_expenses`
- `receivables`
- `payables`
- `supplier_payments`
- `salesperson_commissions`
- `finance_periods`
- `profit_snapshots`

### 7.6 Documents and Signatures

- `documents`
- `document_links`
- `document_templates`
- `document_checklist_templates`
- `document_checklist_items`
- `signature_requests`
- `signature_events`
- `signed_documents`

### 7.7 Marketing

- `marketing_listings`
- `social_posts`
- `campaigns`
- `campaign_metrics`
- `content_calendar_items`
- `lead_source_events`

### 7.8 AI, Alerts, Chat, Reports

- `alerts`
- `alert_events`
- `chat_threads`
- `chat_participants`
- `chat_messages`
- `ai_requests`
- `ai_outputs`
- `saved_reports`
- `report_runs`

## 8. Key Enum Values

Vehicle statuses:

- `available`
- `reserved`
- `sold`
- `in_transit`
- `under_customs_clearance`
- `under_preparation`
- `ready_for_export`
- `delivered`
- `cancelled`

Lead statuses:

- `new`
- `contacted`
- `interested`
- `quotation_sent`
- `reserved`
- `negotiation`
- `won`
- `lost`

Customer types:

- `individual`
- `dealer`
- `company`
- `export_buyer`

Shipping statuses:

- `waiting_booking`
- `booked`
- `vehicle_delivered_to_port`
- `loaded`
- `shipped`
- `arrived`
- `under_clearance`
- `delivered_to_customer`

Signature statuses:

- `draft`
- `sent`
- `viewed`
- `signed`
- `rejected`
- `expired`

## 9. Permission Model

Permissions should be atomic and action-based:

- `vehicles.view`
- `vehicles.create`
- `vehicles.update`
- `vehicles.delete`
- `vehicles.move_branch`
- `vehicles.reserve`
- `vehicles.mark_sold`
- `crm.view`
- `crm.manage_leads`
- `sales.create_quote`
- `sales.create_invoice`
- `payments.view`
- `payments.manage`
- `export.view`
- `export.manage`
- `documents.view`
- `documents.upload`
- `documents.delete`
- `signatures.send`
- `finance.view`
- `finance.manage`
- `marketing.view`
- `marketing.manage`
- `reports.view`
- `reports.export`
- `settings.manage`
- `users.manage`
- `subscriptions.manage`
- `ai.use`
- `ai.manage`

Default roles:

- Owner
- Admin
- General Manager
- Branch Manager
- Sales Manager
- Salesperson
- Export Manager
- Accountant
- Marketing User
- Document Controller
- Read Only

Permission rules:

- Owners and admins manage company settings, users, roles, and subscriptions.
- Salespeople see assigned leads, customers, quotes, and sales unless given broader permissions.
- Branch managers see branch-level inventory, sales, staff, and reports.
- Export managers see export orders, shipping, customs, and export documents.
- Accountants see payments, finance, invoices, receivables, payables, and profit reports.
- AI responses must respect the same permissions as normal UI data access.

## 10. Storage Model

Supabase Storage buckets:

- `vehicle-photos`
- `vehicle-documents`
- `customer-documents`
- `sales-documents`
- `export-documents`
- `signed-documents`
- `marketing-assets`

Storage object path pattern:

```text
company/{company_id}/branch/{branch_id}/module/{record_id}/{file_name}
```

Storage access rules:

- Buckets are private by default.
- Upload, read, update, and delete policies check company membership.
- Sensitive documents require stronger permissions than vehicle photos.
- Signed URLs can be used for temporary previews.
- Service role keys are only used server-side.

## 11. Audit Logging

Every important business action creates an audit log:

- User login and invitation events
- Company settings changes
- Role and permission changes
- Vehicle creation, update, movement, reservation, sale, and archive
- Document upload, deletion, preview, and signature events
- Payment creation, update, deletion, and reconciliation
- Export order status changes
- AI actions that produce or modify business data

Recommended fields:

- `id`
- `company_id`
- `branch_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `old_values`
- `new_values`
- `ip_address`
- `user_agent`
- `created_at`

## 12. AI Architecture

AI must be permission-aware and approval-based for business-changing actions.

AI capabilities:

- Business Q&A
- Vehicle search
- Lead follow-up suggestions
- Pricing assistant
- Marketing caption generator
- Document extraction intake and review workflow
- Report generator
- Alert explanation and suggested action

AI flow:

1. User asks a question or requests an action.
2. Server verifies user, company, role, permissions, subscription, and usage limit.
3. System gathers only allowed data.
4. AI generates answer, table, metric card, draft document, or suggested action.
5. Destructive or external actions require user approval.
6. Request and result are saved to `ai_requests` and `ai_outputs`.

AI must never bypass RLS with a client-side key. Any privileged server access must re-check permissions before querying or mutating data.

## 13. Reporting Model

Reports should be built on normal tables first, then optimized with views or materialized summaries later.

Initial reports:

- Vehicle inventory report
- Stock aging report
- Sales report
- Profit per vehicle
- Profit per brand
- Profit per branch
- Profit per country
- Export orders report
- Shipment tracking report
- Pending payments report
- Supplier performance report
- Customer leads report
- Salesperson commission report
- Marketing performance report
- Consolidated branch report

Saved report fields:

- Report type
- Filters
- Owner user
- Company
- Branch scope
- Export format
- Created date
- Last run date

## 14. MVP Roadmap

Implementation planning must follow the production phase order in `docs/MASTER_BUILD_PROMPT.md`. The roadmap below groups the same work into delivery milestones, but the master prompt is the source of truth when there is any naming or ordering difference.

### MVP 1: SaaS Foundation

Build:

- Next.js app shell
- Supabase project setup
- Auth
- Company onboarding
- Branch setup
- User invitations
- Roles and permissions
- Subscription/package/module tables
- Main layout and sidebar gating
- Audit logs
- Basic settings

Success criteria:

- A user can create or join a company.
- A company can create branches.
- Admin can invite users and assign roles.
- RLS blocks access to another company.
- Sidebar modules are gated by package.

### MVP 2: Inventory Core

Build:

- Vehicle inventory list
- Add/edit vehicle
- Vehicle details
- Vehicle costs
- Vehicle photos
- Vehicle documents checklist
- Vehicle status timeline
- Branch movement

Success criteria:

- Dealer can manage stock and costs.
- Vehicle profit can be calculated.
- Documents and photos can be attached.
- Vehicle movement is audited.

### MVP 3: CRM and Sales Core

Build:

- Customers
- Leads
- Follow-ups
- Lead assignment
- Quotations
- Reservations
- Deposit payments
- Proforma invoices
- Sales invoices

Success criteria:

- Lead can become quotation, reservation, invoice, and sale.
- Vehicle status updates through sales workflow.
- Payments and balances are visible.

### MVP 4: Export Core

Build:

- Export orders
- Import orders
- Shipping tracking
- Customs clearance
- Export document checklist
- Logistics partners
- Destination countries and ports

Success criteria:

- Export team can track vehicle shipment from booking to delivery.
- Missing export documents create alerts.
- Shipping timeline is visible.

### MVP 5: Finance Lite

Build:

- Vehicle cost sheet
- Expenses
- Receivables
- Payables
- Payments
- Profit per car
- Profit per branch
- Salesperson commission

Success criteria:

- Dealer can see landed cost, selling price, gross profit, net profit, and pending balances.

### MVP 6: Documents and Signature

Build:

- File upload workflow
- Document templates
- Document checklist templates
- Missing document alerts
- Signature requests
- Signed archive
- Signature audit trail

Success criteria:

- Documents can be attached to vehicles, customers, orders, and invoices.
- Signature status is tracked from draft to signed.

### MVP 7: Marketing

Build:

- Website listings
- Social media post drafts
- WhatsApp broadcast drafts
- Campaign tracking
- Lead source analytics
- AI caption draft workflow

Success criteria:

- Vehicle data can produce listing and campaign drafts.
- Leads can be attributed to sources.

### MVP 8: AI Layer

Build:

- AI business Q&A
- AI car search
- AI pricing assistant
- AI document extraction intake and review workflow
- AI report generator
- Permission-aware AI logs

Success criteria:

- AI answers operational questions using only permitted data.
- AI-generated actions require approval before changes.

### MVP 9: Reports and Analytics

Build:

- Inventory reports
- Sales reports
- Profit reports
- Export reports
- Marketing reports
- Branch reports
- CSV, Excel, and PDF export workflows

Success criteria:

- Management can answer the final product promise questions from reports and dashboard metrics.

## 15. Implementation Order

1. Create repository structure and Next.js app.
2. Add Supabase local/project configuration.
3. Create initial database migrations for platform core.
4. Implement RLS helper functions and policies.
5. Build auth and company onboarding.
6. Build app shell with sidebar, package gating, and role-aware navigation.
7. Build inventory core.
8. Build CRM and sales core.
9. Build export core.
10. Continue MVPs in roadmap order.

## 16. Security Rules

- Enable RLS on every exposed table.
- Avoid using editable user metadata for authorization.
- Keep service role keys server-side only.
- Use private storage buckets for documents and sensitive files.
- Use indexes on `company_id`, `branch_id`, status fields, date fields, and RLS policy lookup fields.
- Use audit logs for business-critical mutations.
- Use server-side permission checks before privileged AI and automation tasks.
- Avoid public views that bypass RLS; views must be security-aware.
- Test tenant isolation before releasing each module.

## 17. Source Notes

This blueprint follows Supabase's current public guidance verified on 2026-05-18:

- Supabase recommends enabling RLS on exposed-schema tables.
- Supabase RLS policies can integrate with Auth helpers such as `auth.uid()` and `auth.jwt()`.
- Supabase warns that editable user metadata should not be used for authorization decisions.
- Supabase Storage access is controlled through RLS policies on storage objects.
- Supabase service keys bypass RLS and must not be exposed to browsers or customers.

## 18. Open Decisions

The following choices can be finalized during implementation planning:

- Exact billing provider
- Whether initial auth uses password, magic link, or both
- Whether digital signatures are internal first or integrated with a third-party provider
- Exact AI provider and model choices
- Whether reports use live queries only at first or include early summary tables
- Whether the first UI language is English-only with Arabic-ready structure, or English and Arabic from MVP 1

## 19. Initial Database Schema Details

This section defines the starting schema shape. Final SQL migrations should use `uuid` primary keys, `timestamptz` timestamps, check constraints or enum types for statuses, foreign keys for ownership, and indexes on every field used in RLS policies or high-volume filters.

### 19.1 Shared Columns

Most company-owned business tables use this base shape:

- `id uuid primary key default gen_random_uuid()`
- `company_id uuid not null references companies(id)`
- `branch_id uuid null references branches(id)`
- `created_by uuid null references profiles(id)`
- `updated_by uuid null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Recommended indexes:

- `company_id`
- `branch_id`
- `created_at`
- `deleted_at`
- table-specific status fields
- table-specific date fields used by dashboards and reports

### 19.2 Platform Core Tables

`companies`

- `id`
- `name`
- `legal_name`
- `slug`
- `logo_url`
- `primary_country_code`
- `primary_currency_code`
- `default_language`
- `timezone`
- `status`
- `created_at`
- `updated_at`
- `deleted_at`

`branches`

- shared columns
- `name`
- `code`
- `country_code`
- `city`
- `address`
- `phone`
- `email`
- `currency_code`
- `timezone`
- `is_head_office`
- `status`

`profiles`

- `id uuid primary key`
- `auth_user_id uuid not null unique references auth.users(id)`
- `full_name`
- `email`
- `phone`
- `avatar_url`
- `preferred_language`
- `status`
- `created_at`
- `updated_at`

`company_memberships`

- `id`
- `company_id`
- `profile_id`
- `status`
- `joined_at`
- `invited_by`
- `created_at`
- `updated_at`

Unique constraint:

- `(company_id, profile_id)`

`branch_memberships`

- `id`
- `company_id`
- `branch_id`
- `profile_id`
- `status`
- `created_at`
- `updated_at`

Unique constraint:

- `(branch_id, profile_id)`

`roles`

- shared columns without `branch_id`
- `name`
- `key`
- `description`
- `scope`
- `is_system_role`

`permissions`

- `id`
- `module_key`
- `action_key`
- `permission_key`
- `description`
- `created_at`

`role_permissions`

- `id`
- `company_id`
- `role_id`
- `permission_id`
- `created_at`

`user_role_assignments`

- `id`
- `company_id`
- `branch_id`
- `profile_id`
- `role_id`
- `created_at`
- `deleted_at`

`subscriptions`

- shared columns without `branch_id`
- `package_id`
- `status`
- `billing_customer_id`
- `billing_subscription_id`
- `current_period_start`
- `current_period_end`
- `trial_ends_at`
- `cancelled_at`

### 19.3 Vehicle Tables

`vehicles`

- shared columns
- `stock_number`
- `vin`
- `brand`
- `model`
- `year`
- `trim`
- `condition`
- `mileage`
- `exterior_color`
- `interior_color`
- `engine`
- `transmission`
- `drivetrain`
- `fuel_type`
- `body_type`
- `seats`
- `doors`
- `origin_country_code`
- `current_country_code`
- `current_location`
- `purchase_currency_code`
- `selling_currency_code`
- `purchase_price`
- `selling_price`
- `total_landed_cost`
- `expected_profit`
- `profit_margin`
- `status`
- `export_available`
- `website_listing_status`
- `social_media_status`
- `documents_status`
- `photos_status`
- `acquired_at`
- `sold_at`

Unique constraints:

- `(company_id, stock_number)`
- `(company_id, vin)` when VIN is present

`vehicle_costs`

- shared columns
- `vehicle_id`
- `purchase_price`
- `shipping_cost`
- `customs_cost`
- `transport_cost`
- `inspection_cost`
- `repair_cost`
- `detailing_cost`
- `marketing_cost`
- `commission_cost`
- `other_expenses`
- `currency_code`
- `total_landed_cost`

`vehicle_photos`

- shared columns
- `vehicle_id`
- `storage_bucket`
- `storage_path`
- `caption`
- `sort_order`
- `is_primary`

`vehicle_documents`

- shared columns
- `vehicle_id`
- `document_id`
- `document_type`
- `status`
- `expires_at`

`vehicle_status_events`

- shared columns
- `vehicle_id`
- `from_status`
- `to_status`
- `notes`
- `changed_at`

### 19.4 CRM and Sales Tables

`customers`

- shared columns
- `customer_type`
- `name`
- `company_name`
- `phone`
- `whatsapp`
- `email`
- `country_code`
- `city`
- `preferred_language`
- `assigned_to`
- `status`
- `notes`

`leads`

- shared columns
- `customer_id`
- `name`
- `phone`
- `whatsapp`
- `email`
- `country_code`
- `city`
- `preferred_brand`
- `preferred_model`
- `budget_min`
- `budget_max`
- `currency_code`
- `language`
- `lead_source`
- `assigned_to`
- `status`
- `lead_score`
- `last_contact_at`
- `next_follow_up_at`

`follow_ups`

- shared columns
- `lead_id`
- `customer_id`
- `assigned_to`
- `type`
- `due_at`
- `completed_at`
- `status`
- `notes`

`quotations`

- shared columns
- `quotation_number`
- `customer_id`
- `lead_id`
- `vehicle_id`
- `price`
- `discount`
- `tax_amount`
- `total`
- `currency_code`
- `valid_until`
- `salesperson_id`
- `status`
- `notes`

`reservations`

- shared columns
- `reservation_number`
- `vehicle_id`
- `customer_id`
- `deposit_amount`
- `currency_code`
- `reservation_date`
- `expiry_date`
- `payment_status`
- `signature_status`
- `status`

`sales_invoices`

- shared columns
- `invoice_number`
- `customer_id`
- `vehicle_id`
- `final_price`
- `tax_amount`
- `paid_amount`
- `balance_due`
- `currency_code`
- `payment_status`
- `invoice_status`
- `issued_at`
- `due_at`

`payments`

- shared columns
- `customer_id`
- `vehicle_id`
- `invoice_id`
- `reservation_id`
- `amount`
- `currency_code`
- `payment_method`
- `payment_status`
- `paid_at`
- `reference_number`
- `notes`

### 19.5 Export Tables

`export_orders`

- shared columns
- `export_order_number`
- `customer_id`
- `vehicle_id`
- `destination_country_code`
- `destination_port_id`
- `shipping_method`
- `shipping_company_id`
- `booking_number`
- `container_number`
- `bill_of_lading_number`
- `estimated_departure_at`
- `estimated_arrival_at`
- `customs_status`
- `payment_status`
- `document_status`
- `shipping_status`

`shipping_events`

- shared columns
- `export_order_id`
- `status`
- `event_location`
- `event_at`
- `notes`

`customs_clearance_records`

- shared columns
- `export_order_id`
- `country_code`
- `customs_reference`
- `status`
- `submitted_at`
- `cleared_at`
- `notes`

### 19.6 Documents and Signatures Tables

`documents`

- shared columns
- `document_number`
- `document_type`
- `title`
- `storage_bucket`
- `storage_path`
- `mime_type`
- `file_size`
- `status`
- `expires_at`

`document_links`

- `id`
- `company_id`
- `document_id`
- `entity_type`
- `entity_id`
- `created_by`
- `created_at`

`signature_requests`

- shared columns
- `document_id`
- `document_number`
- `document_type`
- `related_entity_type`
- `related_entity_id`
- `sent_to_name`
- `sent_to_email`
- `sent_to_phone`
- `sent_at`
- `viewed_at`
- `signed_at`
- `status`
- `signed_by`
- `ip_address`
- `device_info`

### 19.7 AI and Alert Tables

`alerts`

- shared columns
- `alert_type`
- `severity`
- `title`
- `message`
- `entity_type`
- `entity_id`
- `assigned_to`
- `due_at`
- `resolved_at`
- `status`

`ai_requests`

- shared columns
- `request_type`
- `prompt`
- `context_summary`
- `requested_by`
- `permission_scope`
- `status`
- `created_at`

`ai_outputs`

- shared columns
- `ai_request_id`
- `output_type`
- `content`
- `suggested_action`
- `requires_approval`
- `approved_by`
- `approved_at`
- `created_at`

## 20. RLS Helper Function Design

The first migration should include helper functions in a private schema, for example `app_private`, to keep RLS policies readable.

Required helper functions:

- `app_private.current_profile_id()`
- `app_private.is_company_member(target_company_id uuid)`
- `app_private.has_company_permission(target_company_id uuid, permission_key text)`
- `app_private.can_access_branch(target_company_id uuid, target_branch_id uuid)`

Policy examples to implement in SQL later:

- Select company-owned rows when the user is an active company member.
- Insert company-owned rows only into companies where the user is active and has the required create permission.
- Update rows only when the user has access to the company, branch, and update permission.
- Soft-delete rows through `deleted_at` instead of destructive delete for normal business data.

These functions must be tested with at least two companies and two users to prove cross-tenant data cannot leak.
