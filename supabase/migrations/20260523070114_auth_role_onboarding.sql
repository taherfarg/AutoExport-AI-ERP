alter table public.profiles
  add column if not exists business_role text not null default 'other',
  add column if not exists job_title text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_business_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_business_role_check
      check (business_role in (
        'company_owner',
        'general_manager',
        'sales_manager',
        'salesperson',
        'accountant',
        'inventory_manager',
        'export_manager',
        'marketing_manager',
        'document_controller',
        'service_manager',
        'parts_manager',
        'auditor',
        'other'
      ));
  end if;
end $$;

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_business_role text := coalesce(new.raw_user_meta_data ->> 'business_role', 'other');
begin
  insert into public.profiles (id, auth_user_id, full_name, email, business_role)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    case
      when requested_business_role in (
        'company_owner',
        'general_manager',
        'sales_manager',
        'salesperson',
        'accountant',
        'inventory_manager',
        'export_manager',
        'marketing_manager',
        'document_controller',
        'service_manager',
        'parts_manager',
        'auditor',
        'other'
      )
      then requested_business_role
      else 'other'
    end
  )
  on conflict (auth_user_id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      business_role = excluded.business_role;

  return new;
end;
$$;

with role_templates(role_key, name, description) as (
  values
    ('general_manager', 'General Manager', 'Broad operational access across stock, sales, finance, export, reports, alerts, chat, and AI.'),
    ('sales_manager', 'Sales Manager', 'Sales leadership access for CRM, quotations, reservations, invoices, reports, alerts, chat, and AI.'),
    ('salesperson', 'Salesperson', 'Daily selling access for assigned leads, customers, follow-ups, quotations, and reservations.'),
    ('accountant', 'Accountant', 'Payment, finance, supplier, accounting, export, and financial reporting control.'),
    ('inventory_manager', 'Inventory Manager', 'Vehicle intake, stock movement, costing, photos, documents, valuation, and branch stock control.'),
    ('export_manager', 'Export Manager', 'Import/export, logistics partners, customs, shipment costs, export documents, and export reports.'),
    ('marketing_manager', 'Marketing Manager', 'Listings, social content, campaigns, marketplace sync, lead sources, and marketing AI drafts.'),
    ('document_controller', 'Document Controller', 'Document intake, verification, checklist completion, signature requests, and signed archive.'),
    ('service_manager', 'Service Manager', 'Workshop orders, job cards, technician assignment, inspection results, warranty claims, and service parts.'),
    ('parts_manager', 'Parts Manager', 'Parts catalog, stock, purchase orders, receipts, transfers, reorder alerts, and supplier coordination.'),
    ('auditor', 'Auditor', 'Read-focused access for audit logs, finance, accounting, documents, reports, and operational review.')
),
upserted_roles as (
  insert into public.roles (company_id, name, role_key, description, scope, is_system_role)
  select c.id, rt.name, rt.role_key, rt.description, 'company', true
  from public.companies c
  cross join role_templates rt
  where c.deleted_at is null
  on conflict (company_id, role_key) do update
    set name = excluded.name,
        description = excluded.description,
        is_system_role = true,
        updated_at = now()
  returning id, company_id, role_key
),
all_target_roles as (
  select id, company_id, role_key
  from upserted_roles
  union
  select r.id, r.company_id, r.role_key
  from public.roles r
  join role_templates rt on rt.role_key = r.role_key
  where r.deleted_at is null
),
role_permission_templates(role_key, permission_key) as (
  values
    ('general_manager', 'view_vehicles'),
    ('general_manager', 'create_vehicle'),
    ('general_manager', 'update_vehicle'),
    ('general_manager', 'view_vehicle_cost'),
    ('general_manager', 'view_vehicle_profit'),
    ('general_manager', 'manage_vehicle_intelligence'),
    ('general_manager', 'view_sales'),
    ('general_manager', 'update_quotation'),
    ('general_manager', 'view_payments'),
    ('general_manager', 'view_customers'),
    ('general_manager', 'create_customer'),
    ('general_manager', 'update_customer'),
    ('general_manager', 'view_leads'),
    ('general_manager', 'view_all_leads'),
    ('general_manager', 'create_lead'),
    ('general_manager', 'update_lead'),
    ('general_manager', 'assign_lead'),
    ('general_manager', 'create_follow_up'),
    ('general_manager', 'update_follow_up'),
    ('general_manager', 'create_quotation'),
    ('general_manager', 'approve_discount'),
    ('general_manager', 'reserve_vehicle'),
    ('general_manager', 'create_invoice'),
    ('general_manager', 'view_exports'),
    ('general_manager', 'manage_exports'),
    ('general_manager', 'update_export_status'),
    ('general_manager', 'view_documents'),
    ('general_manager', 'upload_documents'),
    ('general_manager', 'verify_documents'),
    ('general_manager', 'manage_signature_requests'),
    ('general_manager', 'manage_marketing'),
    ('general_manager', 'view_reports'),
    ('general_manager', 'manage_reports'),
    ('general_manager', 'view_alerts'),
    ('general_manager', 'manage_alerts'),
    ('general_manager', 'use_chat'),
    ('general_manager', 'view_finance'),
    ('general_manager', 'manage_finance'),
    ('general_manager', 'view_accounting'),
    ('general_manager', 'manage_suppliers'),
    ('general_manager', 'view_service'),
    ('general_manager', 'manage_service'),
    ('general_manager', 'view_parts'),
    ('general_manager', 'manage_parts'),
    ('general_manager', 'use_ai_assistant'),
    ('general_manager', 'view_ai_automation'),
    ('sales_manager', 'view_vehicles'),
    ('sales_manager', 'view_vehicle_cost'),
    ('sales_manager', 'view_vehicle_profit'),
    ('sales_manager', 'view_sales'),
    ('sales_manager', 'update_quotation'),
    ('sales_manager', 'view_payments'),
    ('sales_manager', 'view_customers'),
    ('sales_manager', 'create_customer'),
    ('sales_manager', 'update_customer'),
    ('sales_manager', 'view_leads'),
    ('sales_manager', 'view_all_leads'),
    ('sales_manager', 'create_lead'),
    ('sales_manager', 'update_lead'),
    ('sales_manager', 'assign_lead'),
    ('sales_manager', 'create_follow_up'),
    ('sales_manager', 'update_follow_up'),
    ('sales_manager', 'create_quotation'),
    ('sales_manager', 'approve_discount'),
    ('sales_manager', 'reserve_vehicle'),
    ('sales_manager', 'create_invoice'),
    ('sales_manager', 'view_documents'),
    ('sales_manager', 'upload_documents'),
    ('sales_manager', 'view_reports'),
    ('sales_manager', 'manage_reports'),
    ('sales_manager', 'view_alerts'),
    ('sales_manager', 'manage_alerts'),
    ('sales_manager', 'use_chat'),
    ('sales_manager', 'manage_commissions'),
    ('sales_manager', 'use_ai_assistant'),
    ('salesperson', 'view_vehicles'),
    ('salesperson', 'view_sales'),
    ('salesperson', 'view_customers'),
    ('salesperson', 'create_customer'),
    ('salesperson', 'update_customer'),
    ('salesperson', 'view_leads'),
    ('salesperson', 'create_lead'),
    ('salesperson', 'update_lead'),
    ('salesperson', 'create_follow_up'),
    ('salesperson', 'update_follow_up'),
    ('salesperson', 'create_quotation'),
    ('salesperson', 'reserve_vehicle'),
    ('salesperson', 'view_documents'),
    ('salesperson', 'upload_documents'),
    ('salesperson', 'view_alerts'),
    ('salesperson', 'use_chat'),
    ('salesperson', 'use_ai_assistant'),
    ('accountant', 'view_vehicles'),
    ('accountant', 'view_vehicle_cost'),
    ('accountant', 'view_vehicle_profit'),
    ('accountant', 'view_sales'),
    ('accountant', 'view_payments'),
    ('accountant', 'record_payment'),
    ('accountant', 'view_customers'),
    ('accountant', 'view_exports'),
    ('accountant', 'view_documents'),
    ('accountant', 'upload_documents'),
    ('accountant', 'verify_documents'),
    ('accountant', 'view_reports'),
    ('accountant', 'manage_reports'),
    ('accountant', 'view_finance'),
    ('accountant', 'manage_finance'),
    ('accountant', 'manage_commissions'),
    ('accountant', 'view_accounting'),
    ('accountant', 'manage_accounting'),
    ('accountant', 'export_accounting'),
    ('accountant', 'manage_suppliers'),
    ('accountant', 'view_audit_logs'),
    ('accountant', 'use_chat'),
    ('inventory_manager', 'view_vehicles'),
    ('inventory_manager', 'create_vehicle'),
    ('inventory_manager', 'update_vehicle'),
    ('inventory_manager', 'delete_vehicle'),
    ('inventory_manager', 'view_vehicle_cost'),
    ('inventory_manager', 'view_vehicle_profit'),
    ('inventory_manager', 'manage_vehicle_intelligence'),
    ('inventory_manager', 'view_exports'),
    ('inventory_manager', 'view_documents'),
    ('inventory_manager', 'upload_documents'),
    ('inventory_manager', 'verify_documents'),
    ('inventory_manager', 'view_reports'),
    ('inventory_manager', 'use_chat'),
    ('inventory_manager', 'use_ai_assistant'),
    ('export_manager', 'view_vehicles'),
    ('export_manager', 'view_customers'),
    ('export_manager', 'view_exports'),
    ('export_manager', 'manage_exports'),
    ('export_manager', 'update_export_status'),
    ('export_manager', 'manage_logistics_partners'),
    ('export_manager', 'view_documents'),
    ('export_manager', 'upload_documents'),
    ('export_manager', 'verify_documents'),
    ('export_manager', 'manage_signature_requests'),
    ('export_manager', 'view_reports'),
    ('export_manager', 'manage_reports'),
    ('export_manager', 'view_alerts'),
    ('export_manager', 'manage_alerts'),
    ('export_manager', 'use_chat'),
    ('export_manager', 'use_ai_assistant'),
    ('marketing_manager', 'view_vehicles'),
    ('marketing_manager', 'view_customers'),
    ('marketing_manager', 'view_leads'),
    ('marketing_manager', 'create_lead'),
    ('marketing_manager', 'manage_marketing'),
    ('marketing_manager', 'view_reports'),
    ('marketing_manager', 'manage_reports'),
    ('marketing_manager', 'use_chat'),
    ('marketing_manager', 'use_ai_assistant'),
    ('document_controller', 'view_vehicles'),
    ('document_controller', 'view_exports'),
    ('document_controller', 'view_customers'),
    ('document_controller', 'view_documents'),
    ('document_controller', 'upload_documents'),
    ('document_controller', 'verify_documents'),
    ('document_controller', 'manage_signature_requests'),
    ('document_controller', 'view_alerts'),
    ('document_controller', 'manage_alerts'),
    ('document_controller', 'use_chat'),
    ('document_controller', 'use_ai_assistant'),
    ('service_manager', 'view_vehicles'),
    ('service_manager', 'view_customers'),
    ('service_manager', 'view_documents'),
    ('service_manager', 'upload_documents'),
    ('service_manager', 'view_service'),
    ('service_manager', 'manage_service'),
    ('service_manager', 'assign_service_jobs'),
    ('service_manager', 'manage_warranty_claims'),
    ('service_manager', 'view_parts'),
    ('service_manager', 'manage_parts'),
    ('service_manager', 'view_reports'),
    ('service_manager', 'view_alerts'),
    ('service_manager', 'manage_alerts'),
    ('service_manager', 'use_chat'),
    ('parts_manager', 'view_service'),
    ('parts_manager', 'view_parts'),
    ('parts_manager', 'manage_parts'),
    ('parts_manager', 'manage_part_orders'),
    ('parts_manager', 'transfer_parts'),
    ('parts_manager', 'manage_suppliers'),
    ('parts_manager', 'view_reports'),
    ('parts_manager', 'view_alerts'),
    ('parts_manager', 'manage_alerts'),
    ('parts_manager', 'use_chat'),
    ('auditor', 'view_vehicles'),
    ('auditor', 'view_vehicle_cost'),
    ('auditor', 'view_vehicle_profit'),
    ('auditor', 'view_sales'),
    ('auditor', 'view_payments'),
    ('auditor', 'view_customers'),
    ('auditor', 'view_leads'),
    ('auditor', 'view_exports'),
    ('auditor', 'view_documents'),
    ('auditor', 'view_reports'),
    ('auditor', 'view_finance'),
    ('auditor', 'view_accounting'),
    ('auditor', 'view_service'),
    ('auditor', 'view_parts'),
    ('auditor', 'view_billing'),
    ('auditor', 'view_audit_logs'),
    ('auditor', 'use_chat')
),
owner_roles as (
  select id, company_id
  from public.roles
  where role_key = 'company_owner'
    and deleted_at is null
)
insert into public.role_permissions (company_id, role_id, permission_id)
select owner_roles.company_id, owner_roles.id, p.id
from owner_roles
cross join public.permissions p
on conflict (role_id, permission_id) do nothing;

with role_permission_templates(role_key, permission_key) as (
  values
    ('general_manager', 'view_vehicles'), ('general_manager', 'create_vehicle'), ('general_manager', 'update_vehicle'), ('general_manager', 'view_vehicle_cost'), ('general_manager', 'view_vehicle_profit'), ('general_manager', 'manage_vehicle_intelligence'), ('general_manager', 'view_sales'), ('general_manager', 'update_quotation'), ('general_manager', 'view_payments'), ('general_manager', 'view_customers'), ('general_manager', 'create_customer'), ('general_manager', 'update_customer'), ('general_manager', 'view_leads'), ('general_manager', 'view_all_leads'), ('general_manager', 'create_lead'), ('general_manager', 'update_lead'), ('general_manager', 'assign_lead'), ('general_manager', 'create_follow_up'), ('general_manager', 'update_follow_up'), ('general_manager', 'create_quotation'), ('general_manager', 'approve_discount'), ('general_manager', 'reserve_vehicle'), ('general_manager', 'create_invoice'), ('general_manager', 'view_exports'), ('general_manager', 'manage_exports'), ('general_manager', 'update_export_status'), ('general_manager', 'view_documents'), ('general_manager', 'upload_documents'), ('general_manager', 'verify_documents'), ('general_manager', 'manage_signature_requests'), ('general_manager', 'manage_marketing'), ('general_manager', 'view_reports'), ('general_manager', 'manage_reports'), ('general_manager', 'view_alerts'), ('general_manager', 'manage_alerts'), ('general_manager', 'use_chat'), ('general_manager', 'view_finance'), ('general_manager', 'manage_finance'), ('general_manager', 'view_accounting'), ('general_manager', 'manage_suppliers'), ('general_manager', 'view_service'), ('general_manager', 'manage_service'), ('general_manager', 'view_parts'), ('general_manager', 'manage_parts'), ('general_manager', 'use_ai_assistant'), ('general_manager', 'view_ai_automation'),
    ('sales_manager', 'view_vehicles'), ('sales_manager', 'view_vehicle_cost'), ('sales_manager', 'view_vehicle_profit'), ('sales_manager', 'view_sales'), ('sales_manager', 'update_quotation'), ('sales_manager', 'view_payments'), ('sales_manager', 'view_customers'), ('sales_manager', 'create_customer'), ('sales_manager', 'update_customer'), ('sales_manager', 'view_leads'), ('sales_manager', 'view_all_leads'), ('sales_manager', 'create_lead'), ('sales_manager', 'update_lead'), ('sales_manager', 'assign_lead'), ('sales_manager', 'create_follow_up'), ('sales_manager', 'update_follow_up'), ('sales_manager', 'create_quotation'), ('sales_manager', 'approve_discount'), ('sales_manager', 'reserve_vehicle'), ('sales_manager', 'create_invoice'), ('sales_manager', 'view_documents'), ('sales_manager', 'upload_documents'), ('sales_manager', 'view_reports'), ('sales_manager', 'manage_reports'), ('sales_manager', 'view_alerts'), ('sales_manager', 'manage_alerts'), ('sales_manager', 'use_chat'), ('sales_manager', 'manage_commissions'), ('sales_manager', 'use_ai_assistant'),
    ('salesperson', 'view_vehicles'), ('salesperson', 'view_sales'), ('salesperson', 'view_customers'), ('salesperson', 'create_customer'), ('salesperson', 'update_customer'), ('salesperson', 'view_leads'), ('salesperson', 'create_lead'), ('salesperson', 'update_lead'), ('salesperson', 'create_follow_up'), ('salesperson', 'update_follow_up'), ('salesperson', 'create_quotation'), ('salesperson', 'reserve_vehicle'), ('salesperson', 'view_documents'), ('salesperson', 'upload_documents'), ('salesperson', 'view_alerts'), ('salesperson', 'use_chat'), ('salesperson', 'use_ai_assistant'),
    ('accountant', 'view_vehicles'), ('accountant', 'view_vehicle_cost'), ('accountant', 'view_vehicle_profit'), ('accountant', 'view_sales'), ('accountant', 'view_payments'), ('accountant', 'record_payment'), ('accountant', 'view_customers'), ('accountant', 'view_exports'), ('accountant', 'view_documents'), ('accountant', 'upload_documents'), ('accountant', 'verify_documents'), ('accountant', 'view_reports'), ('accountant', 'manage_reports'), ('accountant', 'view_finance'), ('accountant', 'manage_finance'), ('accountant', 'manage_commissions'), ('accountant', 'view_accounting'), ('accountant', 'manage_accounting'), ('accountant', 'export_accounting'), ('accountant', 'manage_suppliers'), ('accountant', 'view_audit_logs'), ('accountant', 'use_chat'),
    ('inventory_manager', 'view_vehicles'), ('inventory_manager', 'create_vehicle'), ('inventory_manager', 'update_vehicle'), ('inventory_manager', 'delete_vehicle'), ('inventory_manager', 'view_vehicle_cost'), ('inventory_manager', 'view_vehicle_profit'), ('inventory_manager', 'manage_vehicle_intelligence'), ('inventory_manager', 'view_exports'), ('inventory_manager', 'view_documents'), ('inventory_manager', 'upload_documents'), ('inventory_manager', 'verify_documents'), ('inventory_manager', 'view_reports'), ('inventory_manager', 'use_chat'), ('inventory_manager', 'use_ai_assistant'),
    ('export_manager', 'view_vehicles'), ('export_manager', 'view_customers'), ('export_manager', 'view_exports'), ('export_manager', 'manage_exports'), ('export_manager', 'update_export_status'), ('export_manager', 'manage_logistics_partners'), ('export_manager', 'view_documents'), ('export_manager', 'upload_documents'), ('export_manager', 'verify_documents'), ('export_manager', 'manage_signature_requests'), ('export_manager', 'view_reports'), ('export_manager', 'manage_reports'), ('export_manager', 'view_alerts'), ('export_manager', 'manage_alerts'), ('export_manager', 'use_chat'), ('export_manager', 'use_ai_assistant'),
    ('marketing_manager', 'view_vehicles'), ('marketing_manager', 'view_customers'), ('marketing_manager', 'view_leads'), ('marketing_manager', 'create_lead'), ('marketing_manager', 'manage_marketing'), ('marketing_manager', 'view_reports'), ('marketing_manager', 'manage_reports'), ('marketing_manager', 'use_chat'), ('marketing_manager', 'use_ai_assistant'),
    ('document_controller', 'view_vehicles'), ('document_controller', 'view_exports'), ('document_controller', 'view_customers'), ('document_controller', 'view_documents'), ('document_controller', 'upload_documents'), ('document_controller', 'verify_documents'), ('document_controller', 'manage_signature_requests'), ('document_controller', 'view_alerts'), ('document_controller', 'manage_alerts'), ('document_controller', 'use_chat'), ('document_controller', 'use_ai_assistant'),
    ('service_manager', 'view_vehicles'), ('service_manager', 'view_customers'), ('service_manager', 'view_documents'), ('service_manager', 'upload_documents'), ('service_manager', 'view_service'), ('service_manager', 'manage_service'), ('service_manager', 'assign_service_jobs'), ('service_manager', 'manage_warranty_claims'), ('service_manager', 'view_parts'), ('service_manager', 'manage_parts'), ('service_manager', 'view_reports'), ('service_manager', 'view_alerts'), ('service_manager', 'manage_alerts'), ('service_manager', 'use_chat'),
    ('parts_manager', 'view_service'), ('parts_manager', 'view_parts'), ('parts_manager', 'manage_parts'), ('parts_manager', 'manage_part_orders'), ('parts_manager', 'transfer_parts'), ('parts_manager', 'manage_suppliers'), ('parts_manager', 'view_reports'), ('parts_manager', 'view_alerts'), ('parts_manager', 'manage_alerts'), ('parts_manager', 'use_chat'),
    ('auditor', 'view_vehicles'), ('auditor', 'view_vehicle_cost'), ('auditor', 'view_vehicle_profit'), ('auditor', 'view_sales'), ('auditor', 'view_payments'), ('auditor', 'view_customers'), ('auditor', 'view_leads'), ('auditor', 'view_exports'), ('auditor', 'view_documents'), ('auditor', 'view_reports'), ('auditor', 'view_finance'), ('auditor', 'view_accounting'), ('auditor', 'view_service'), ('auditor', 'view_parts'), ('auditor', 'view_billing'), ('auditor', 'view_audit_logs'), ('auditor', 'use_chat')
)
insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
join role_permission_templates rpt on rpt.role_key = r.role_key
join public.permissions p on p.permission_key = rpt.permission_key
where r.deleted_at is null
on conflict (role_id, permission_id) do nothing;
