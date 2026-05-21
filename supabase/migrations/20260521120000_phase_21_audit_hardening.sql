-- Phase 21: Audit Hardening - Indexes, Triggers, and Schema Improvements
-- Adds missing indexes for performance, updated_at triggers, and other hardening

-- ===========================================================================
-- 1. MISSING INDEXES ON FREQUENTLY QUERIED COLUMNS
-- ===========================================================================

-- Vehicle queries by status (filtered on every list view)
create index if not exists idx_vehicles_status on public.vehicles(status) where deleted_at is null;
create index if not exists idx_vehicles_company_status on public.vehicles(company_id, status) where deleted_at is null;
create index if not exists idx_vehicles_branch_status on public.vehicles(branch_id, status) where deleted_at is null;

-- Lead queries by status (CRM pipeline views)
create index if not exists idx_leads_status on public.leads(status) where deleted_at is null;
create index if not exists idx_leads_company_status on public.leads(company_id, status) where deleted_at is null;
create index if not exists idx_leads_assigned on public.leads(assigned_salesperson_id) where deleted_at is null;

-- Journal entries by date (ledger views, sorted by posted_at)
create index if not exists idx_journal_entries_posted on public.journal_entries(company_id, posted_at desc) where deleted_at is null;
create index if not exists idx_journal_entries_status on public.journal_entries(company_id, status) where deleted_at is null;

-- Service tickets by status (workshop dispatch board)
create index if not exists idx_service_orders_status on public.service_orders(company_id, status) where deleted_at is null;
create index if not exists idx_service_orders_branch on public.service_orders(branch_id, status) where deleted_at is null;
create index if not exists idx_service_jobs_order on public.service_jobs(service_order_id) where deleted_at is null;

-- Parts stock by branch (inventory views)
create index if not exists idx_parts_stock_branch on public.part_stock(branch_id) where deleted_at is null;
create index if not exists idx_parts_stock_part on public.part_stock(part_id) where deleted_at is null;
create index if not exists idx_parts_stock_reorder on public.part_stock(company_id, quantity_on_hand) where deleted_at is null;

-- Purchase orders
create index if not exists idx_part_purchase_orders_status on public.part_purchase_orders(company_id, status) where deleted_at is null;

-- Documents polymorphic links
create index if not exists idx_document_links_entity_composite on public.document_links(entity_type, entity_id);

-- Invoices by status (Indexed in phase 4 sales transactions)
-- create index if not exists idx_invoices_status on public.invoices(company_id, status) where deleted_at is null;

-- Quotations by status
create index if not exists idx_quotations_status on public.quotations(company_id, status) where deleted_at is null;

-- Payments by date
create index if not exists idx_payments_date on public.payments(company_id, payment_date desc);

-- Audit logs (for audit log viewer)
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_profile_id, created_at desc);

-- Chat messages
create index if not exists idx_chat_messages_thread on public.chat_messages(thread_id, created_at desc);

-- Alerts (Alert rules are not used/defined, public.alerts is already indexed in phase 10)
-- create index if not exists idx_alerts_company_status on public.alert_rules(company_id, is_active);

-- Marketplace sync
create index if not exists idx_marketing_listings_vehicle on public.marketing_listings(vehicle_id) where deleted_at is null;

-- Communications
create index if not exists idx_outbound_messages_lead on public.outbound_messages(lead_id, created_at desc);

-- AI automation
create index if not exists idx_ai_proposals_company on public.ai_automation_proposals(company_id, status, created_at desc);

-- ===========================================================================
-- 2. UPDATED_AT TRIGGER FUNCTION (ensure it exists)
-- ===========================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===========================================================================
-- 3. ADD MISSING updated_at TRIGGERS
-- ===========================================================================

-- Only create triggers if they don't already exist (use DO blocks)
do $$
declare
  trigger_defs text[] := array[
    'vehicles', 'leads', 'customers', 'quotations', 'sales_invoices', 'proforma_invoices',
    'payments', 'documents', 'branches', 'profiles', 'roles',
    'journal_entries', 'journal_entry_lines', 'gl_accounts',
    'bank_transactions', 'bank_reconciliations', 'tax_rates', 'tax_reports',
    'service_orders', 'service_jobs', 'service_appointments', 'technicians',
    'service_labor_lines', 'inspection_results', 'warranty_claims',
    'parts', 'part_stock', 'part_suppliers', 'part_purchase_orders', 'part_purchase_order_items',
    'marketing_listings',
    'communication_providers', 'message_templates', 'customer_consents',
    'ai_automation_agents'
  ];
  tbl text;
begin
  foreach tbl in array trigger_defs loop
    if not exists (
      select 1 from pg_trigger where tgname = tbl || '_set_updated_at'
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        tbl || '_set_updated_at', tbl
      );
    end if;
  end loop;
end $$;

-- ===========================================================================
-- 4. ADD deleted_at COLUMN FOR SOFT DELETES (where missing)
-- ===========================================================================

alter table public.leads add column if not exists deleted_at timestamptz;
alter table public.customers add column if not exists deleted_at timestamptz;
alter table public.documents add column if not exists deleted_at timestamptz;
-- alter table public.alert_rules add column if not exists deleted_at timestamptz;
alter table public.chat_messages add column if not exists deleted_at timestamptz;
