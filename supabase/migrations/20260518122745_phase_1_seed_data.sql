insert into public.modules (module_key, name, description, sort_order, is_core) values
('dashboard', 'Dashboard', 'Company KPIs and operational overview.', 10, true),
('vehicles', 'Vehicle Inventory', 'Manage stock, vehicle status, costs, and branch movement.', 20, true),
('global_stock', 'Global Stock', 'View stock across branches and countries.', 30, false),
('crm', 'Sales CRM', 'Manage customers, leads, follow-ups, and opportunities.', 40, false),
('sales', 'Sales', 'Manage quotations, reservations, proformas, invoices, and payments.', 50, false),
('export', 'Import & Export', 'Manage export orders, import orders, shipping, and customs.', 60, false),
('documents', 'Documents', 'Manage secure vehicle, customer, and sales documents.', 70, false),
('finance', 'Finance Lite', 'Manage vehicle costing, receivables, payables, and profit.', 80, false),
('marketing', 'Marketing & Listings', 'Manage listings, campaigns, and social content.', 90, false),
('ai', 'AI Technical Intelligence', 'Permission-aware AI assistant and automation.', 100, false),
('reports', 'Reports', 'Inventory, sales, export, finance, and branch reports.', 110, false),
('settings', 'Settings', 'Company, branch, user, role, and subscription settings.', 120, true);

insert into public.packages (package_key, name, description, monthly_price, currency_code, max_branches, max_users, max_vehicles, max_ai_requests) values
('starter', 'Starter', 'For small car showrooms.', 49, 'USD', 1, 3, 100, 100),
('showroom_pro', 'Showroom Pro', 'For active car dealers.', 149, 'USD', 3, 10, 500, 1000),
('export_business', 'Export Business', 'For import/export dealers.', 299, 'USD', 10, 25, 2000, 3000),
('enterprise_dealer_group', 'Enterprise Dealer Group', 'For multi-branch dealer groups.', 799, 'USD', null, null, null, 10000);

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key in ('dashboard', 'vehicles', 'crm', 'reports', 'settings')
where p.package_key = 'starter';

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key in ('dashboard', 'vehicles', 'global_stock', 'crm', 'sales', 'documents', 'marketing', 'ai', 'reports', 'settings')
where p.package_key = 'showroom_pro';

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key in ('dashboard', 'vehicles', 'global_stock', 'crm', 'sales', 'export', 'documents', 'finance', 'marketing', 'ai', 'reports', 'settings')
where p.package_key = 'export_business';

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
cross join public.modules m
where p.package_key = 'enterprise_dealer_group';

insert into public.permissions (module_key, action_key, permission_key, description) values
('vehicles', 'view', 'view_vehicles', 'View vehicle inventory.'),
('vehicles', 'create', 'create_vehicle', 'Create vehicles.'),
('vehicles', 'update', 'update_vehicle', 'Update vehicles.'),
('vehicles', 'delete', 'delete_vehicle', 'Archive vehicles.'),
('vehicles', 'view_cost', 'view_vehicle_cost', 'View landed cost.'),
('vehicles', 'view_profit', 'view_vehicle_profit', 'View profit and margin.'),
('sales', 'create_quotation', 'create_quotation', 'Create quotations.'),
('sales', 'approve_discount', 'approve_discount', 'Approve discounts.'),
('sales', 'reserve_vehicle', 'reserve_vehicle', 'Reserve vehicles.'),
('sales', 'create_invoice', 'create_invoice', 'Create invoices.'),
('sales', 'record_payment', 'record_payment', 'Record payments.'),
('export', 'manage', 'manage_exports', 'Manage import/export operations.'),
('documents', 'upload', 'upload_documents', 'Upload documents.'),
('documents', 'verify', 'verify_documents', 'Verify documents.'),
('marketing', 'manage', 'manage_marketing', 'Manage marketing listings and campaigns.'),
('reports', 'view', 'view_reports', 'View reports.'),
('finance', 'view', 'view_finance', 'View finance data.'),
('settings', 'manage_users', 'manage_users', 'Manage users and roles.'),
('settings', 'manage_subscriptions', 'manage_subscriptions', 'Manage subscriptions.'),
('settings', 'manage_company_settings', 'manage_company_settings', 'Manage company settings.'),
('settings', 'view_audit_logs', 'view_audit_logs', 'View audit logs.'),
('ai', 'use', 'use_ai_assistant', 'Use AI assistant.');
