# AutoSphere ERP Master Production Build Prompt

Use this prompt as the product and engineering charter for every implementation plan and coding phase.

## Role

You are a senior full-stack engineer, SaaS architect, ERP architect, database architect, AI software architect, cybersecurity-aware engineer, and senior UI/UX designer.

## Product

Build the actual production system for **AutoSphere ERP**, also usable as the **Pollux Auto Intelligence ERP** case study.

This is a white-label Automotive SaaS ERP for car showrooms, dealers, brokers, automotive import/export companies, and multi-branch car trading groups.

The system must be production-ready, scalable, secure, and built as a real SaaS application.

Do not build a prototype.  
Do not use only mock data.  
Do not make placeholder-only screens.  
Do not skip backend logic.  
Do not ignore security.  
Do not build generic ERP modules for all industries.

Build the real system step by step with a clean, scalable architecture.

## Required Stack

Frontend:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- Recharts
- React Hook Form
- Zod validation
- TanStack Table
- TanStack Query where useful

Backend:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Supabase Storage
- Supabase Edge Functions where needed
- Postgres functions and triggers where useful

AI:

- OpenAI API or compatible provider
- AI tool/function calling architecture
- Human approval before sensitive actions

Payments:

- Stripe initially
- Architecture must allow local payment gateways later

Integrations:

- WhatsApp Business API / Meta Cloud API architecture
- Instagram/Facebook Graph API architecture
- Email provider architecture
- Digital signature provider architecture
- Shipping/logistics provider architecture

Deployment:

- Vercel frontend
- Supabase backend
- Environment variables
- Dev, staging, and production separation

Testing:

- Unit tests for core business logic
- Integration tests for critical workflows
- E2E test structure for sales workflow
- Basic security checks

## Production Development Rules

At each phase:

- Build database schema
- Build backend logic
- Build RLS policies
- Build frontend UI
- Build forms with Zod validation
- Build API/server actions
- Build tests where needed
- Update documentation

Do not start with UI only. Start with real architecture, schema, auth, permissions, and data model.

## Phase Order

1. SaaS foundation, authentication, multi-tenancy, companies, branches, users, roles, permissions, subscriptions.
2. Vehicle inventory, vehicle details, photos, documents, vehicle costing, stock status, branch movement.
3. CRM, leads, customers, follow-ups, sales pipeline.
4. Quotations, reservations, proforma invoices, sales invoices, payments.
5. Import/export, shipping, customs, export documents.
6. Finance Lite, profit per car, branch profit, salesperson commission, receivables, payables.
7. Documents, digital signature, document checklist, secure storage.
8. Marketing, listings, social media generator, content calendar.
9. AI Technical Intelligence, AI assistant, AI car search, AI pricing, AI reports, AI document extraction.
10. Reports, analytics, smart alerts, notifications, chat, audit logs.

## Multi-Tenancy Requirements

The system is multi-tenant.

Main tenant entity:

- `companies`

Every business table must include:

- `id`
- `company_id`
- `branch_id` when applicable
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `deleted_at` nullable for soft delete

Security rules:

- Users can only access data from their company.
- Branch users can only access their branch unless given multi-branch permission.
- Admin users can manage company settings.
- Super admin can manage platform-level data.
- RLS policies must enforce tenant isolation.
- Never rely only on frontend filtering.
- All sensitive actions must be logged in `audit_logs`.

## Roles

Required roles:

- Super Admin
- Company Owner
- General Manager
- Branch Manager
- Sales Manager
- Salesperson
- Accountant
- Inventory Manager
- Export Manager
- Marketing Manager
- Document Controller
- Auditor

## Permission Examples

- `view_vehicles`
- `create_vehicle`
- `update_vehicle`
- `delete_vehicle`
- `view_vehicle_cost`
- `view_vehicle_profit`
- `create_quotation`
- `approve_discount`
- `reserve_vehicle`
- `create_invoice`
- `record_payment`
- `manage_exports`
- `upload_documents`
- `verify_documents`
- `manage_marketing`
- `view_reports`
- `view_finance`
- `manage_users`
- `manage_subscriptions`
- `manage_company_settings`
- `use_ai_assistant`

## Required Database Groups

Core SaaS:

- `companies`
- `branches`
- `profiles`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `subscriptions`
- `packages`
- `package_modules`
- `modules`
- `audit_logs`
- `notifications`
- `company_settings`
- `branch_settings`

Vehicles:

- `vehicles`
- `vehicle_costs`
- `vehicle_photos`
- `vehicle_documents`
- `vehicle_status_history`
- `vehicle_branch_movements`
- `vehicle_price_history`
- `vehicle_reservations_history`

CRM:

- `customers`
- `leads`
- `lead_messages`
- `follow_ups`
- `opportunities`
- `customer_notes`
- `customer_documents`

Sales:

- `quotations`
- `quotation_items`
- `reservations`
- `proforma_invoices`
- `proforma_invoice_items`
- `sales_invoices`
- `sales_invoice_items`
- `payments`
- `refunds`
- `salesperson_commissions`

Import/Export:

- `export_orders`
- `import_orders`
- `shipping_events`
- `customs_clearance`
- `logistics_partners`
- `destination_countries`
- `export_documents`
- `shipment_costs`

Documents:

- `documents`
- `document_links`
- `document_checklists`
- `document_templates`
- `document_verifications`
- `signature_requests`
- `signed_documents`

Finance Lite:

- `expenses`
- `payables`
- `receivables`
- `vehicle_profit_snapshots`
- `branch_profit_snapshots`
- `payment_methods`
- `bank_accounts`
- `cash_accounts`

Marketing:

- `marketing_listings`
- `listing_channels`
- `social_posts`
- `campaigns`
- `content_calendar`
- `lead_sources`

AI:

- `ai_conversations`
- `ai_messages`
- `ai_requests`
- `ai_actions`
- `ai_approvals`
- `ai_extracted_documents`
- `ai_report_requests`

Alerts and tasks:

- `alerts`
- `tasks`
- `task_comments`
- `reminders`

Chat:

- `chat_threads`
- `chat_participants`
- `chat_messages`
- `chat_attachments`

Reports:

- `saved_reports`
- `report_exports`
- `report_schedules`

For each table define columns, data types, foreign keys, indexes, RLS policies, soft delete behavior, and audit log triggers for sensitive actions.

## Core Business Modules

Vehicle Inventory:

- Add, edit, archive, search, and filter vehicles.
- Upload photos and documents.
- Move vehicles between branches.
- Reserve vehicles and mark as sold.
- View cost sheet and calculate profit.
- View status timeline and document checklist.
- Generate listing, quotation, and proforma invoice.
- Enforce VIN and stock number uniqueness per company.
- Prevent double reservation.
- Restrict sold vehicle edits.
- Restrict cost and profit visibility by permission.
- Record status history and branch movement history.

Vehicle Details:

- Vehicle overview
- Specifications
- Photos
- Pricing and cost breakdown
- Profit calculation
- Documents checklist
- Sales history
- Lead interest
- Export readiness
- Status timeline
- AI recommendations

Smart Vehicle Pricing:

- Reusable pricing calculation functions.
- Pricing history.
- Scenario comparison.
- Manager approval for discounts above threshold.
- Quotation and social offer creation from pricing result.

CRM:

- Customers, leads, opportunities, follow-ups, customer timeline, pipeline, lead source tracking, assignment, AI lead scoring.
- Salespeople see only assigned leads unless granted broader access.
- Managers see team leads.
- Follow-up reminders create alerts.

Sales Workflow:

- Lead to assigned salesperson to requirements to AI matching to quotation to reservation to deposit to proforma to final payment to invoice to delivery/export to completed deal to profit calculation to follow-up.
- Include visual workflow timeline, documents, payments, vehicle, customer, actions, and audit logs.

Documents:

- Use Supabase Storage.
- Files isolated by company.
- Use signed URLs or protected access.
- Store metadata in `documents`.
- Link files through `document_links`.
- Support verification, checklists, expiry alerts, signed archive, and AI extraction intake.

Digital Signature:

- Initial internal signature pad workflow.
- Store signature image, signer metadata, status, and audit trail.
- Keep architecture provider-ready.

Finance Lite:

- Vehicle costing, payments, receivables, payables, expenses, profit per car, branch profit, country profit, salesperson commission.
- This is not full accounting.

Marketing:

- Listings, social drafts, campaigns, content calendar, AI captions, video scripts, manual schedule/publish status, source performance.

AI Technical Intelligence:

- Permission-aware AI chat and tools.
- AI cannot reveal unauthorized finance/profit data.
- AI cannot send customer messages, change prices, create final invoices, or modify sensitive data without approval.
- Store requests, actions, and approvals.

Required AI tools:

- `searchVehicles`
- `getVehicleDetails`
- `getAvailableStock`
- `getLeadsDueToday`
- `getPendingPayments`
- `getMissingDocuments`
- `calculateVehiclePricing`
- `generateListingDraft`
- `generateSocialPostDraft`
- `createQuotationDraft`
- `createFollowUpTask`
- `generateReportDraft`

Alerts:

- Reserved without deposit
- Overdue payment
- Missing export documents
- Shipment delayed
- Customs pending
- Low margin
- Aging stock over 60 days
- Supplier payment due
- Preparation delayed
- New lead not contacted
- Contract waiting signature
- Insurance expiring
- Registration renewal due
- Campaign underperforming
- Branch sales target not reached

Chat:

- Team, branch, vehicle-specific, customer log, internal support, and AI assistant chat.
- Use Supabase Realtime if practical.

Reports:

- Inventory, stock aging, sales, profit, export, shipment, pending payments, supplier performance, leads, commission, marketing, consolidated branch.
- CSV first.
- PDF and Excel architecture ready.

## Subscription Packages

Packages:

1. Starter
2. Showroom Pro
3. Export Business
4. Enterprise Dealer Group

Build:

- Package definitions
- Module access by package
- Company subscription
- Locked modules
- Upgrade page
- Usage limit architecture
- Stripe-ready structure

## White-Label Branding

Company can configure:

- Logo
- Primary color
- Secondary color
- Company name
- Email sender name architecture
- Custom domain architecture
- Invoice template branding
- Quotation template branding

## UI Requirements

Create a premium professional UI:

- Modern SaaS dashboard
- Luxury automotive feel
- Clean white/dark/gray base
- Orange/blue accents
- Professional cards
- Strong vehicle tables
- Vehicle details pages
- KPI cards
- Charts
- Status badges
- Responsive layout

Avoid:

- Basic admin dashboard
- Generic template feel
- Unprofessional colors
- Overcrowded UI
- Dead placeholder pages

## Seed Data

Create realistic development seed data.

Companies:

- Pollux Motors
- Gulf Auto Export
- Emirates Motors Trading
- Sahara Auto Import

Branches:

- Head Office - Dubai
- Stock Yard - Belgium
- Sales Office - Algeria
- Export Office - UAE

Vehicles:

- Toyota Hilux GR Sport 2025
- Ford Ranger Raptor 2025
- Toyota Land Cruiser Prado 2026
- Lexus LX 600 2025
- Jetour T2 2025
- MG5 2026
- Kia Sportage GT-Line 2026
- Toyota Land Cruiser 300 2025
- Mercedes-Benz G-Class 2024
- Nissan Patrol 2025

Seed at least 20 realistic vehicles total.

Customers and leads:

- Algeria Auto Dealer
- Dubai Towers Contracting
- Sahara Motors DZ
- Gulf Fleet Buyers
- Private Export Customer

Export destinations:

- Algeria
- Egypt
- Libya
- Ghana
- Belgium
- Qatar
- Oman
- Saudi Arabia

Users:

- General manager
- Sales manager
- Salesperson
- Export manager
- Accountant
- Document controller
- Marketing manager

## Deliverables

- Full Next.js production app
- Supabase schema SQL migrations
- RLS policies
- Seed data
- Reusable UI components
- Reusable business logic functions
- Auth flow
- Multi-tenant workspace flow
- Role-based permissions
- File upload system
- Core modules
- Tests for pricing and permissions
- README
- ENV example
- Deployment instructions
- Architecture documentation

## README Requirements

Explain:

- Product overview
- Target users
- Main modules
- Tech stack
- How to run locally
- Environment variables
- Supabase setup
- Database migrations
- RLS model
- Role/permission system
- AI architecture
- Payment architecture
- Integration roadmap
- Deployment guide
- Known limitations
- Future roadmap

## First Implementation Priority

Build in this order:

1. Project setup
2. Auth
3. Supabase connection
4. Database schema
5. RLS policies
6. Companies/workspaces
7. Branches
8. Users/roles/permissions
9. Subscriptions/module access
10. Main dashboard
11. Vehicle inventory
12. Vehicle details
13. Vehicle pricing/costing
14. CRM/leads
15. Quotations/reservations
16. Documents/storage
17. Payments
18. Export orders
19. Finance Lite
20. AI assistant architecture
21. Smart alerts
22. Reports

## Final Quality Goal

The system must help a dealership answer instantly:

- How many cars are in stock?
- Which cars are available?
- Which cars are reserved?
- Which cars are sold?
- Which cars are ready for export?
- Which cars have missing documents?
- Which leads need follow-up?
- Which customer has pending payment?
- Which car has low profit margin?
- Which branch is performing best?
- Which salesperson sold the most?
- Which marketing channel brings leads?
- Which shipment is delayed?
- What should the AI recommend today?

Build this as a real, scalable, secure SaaS product.
