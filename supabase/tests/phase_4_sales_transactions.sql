begin;

select plan(7);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'quotations',
        'quotation_items',
        'reservations',
        'proforma_invoices',
        'proforma_invoice_items',
        'sales_invoices',
        'sales_invoice_items',
        'payments'
      )
      and rowsecurity is false
  ),
  'all phase 4 sales tables have RLS enabled'
);

select is(
  public.calculate_sales_total(100000, 5000, 2500),
  97500::numeric,
  'sales total subtracts discount and adds tax'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'view_sales'),
  'view_sales permission exists'
);

create temp table sales_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as vehicle_a,
       gen_random_uuid() as vehicle_b;

grant select on sales_probe_ids to authenticated;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
select user_a,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'sales-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from sales_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'sales-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from sales_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Sales Company A', 'sales-company-a' from sales_probe_ids
union all
select company_b, 'Sales Company B', 'sales-company-b' from sales_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'Sales Branch A', 'SLA', 'Dubai' from sales_probe_ids
union all
select branch_b, company_b, 'Sales Branch B', 'SLB', 'Doha' from sales_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from sales_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from sales_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Sales Manager A', 'sales_manager_a', 'Sales manager test role.', true from sales_probe_ids
union all
select role_b, company_b, 'Sales Manager B', 'sales_manager_b', 'Sales manager test role.', true from sales_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from sales_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_sales',
  'view_payments',
  'create_quotation',
  'update_quotation',
  'reserve_vehicle',
  'create_invoice',
  'record_payment',
  'view_vehicles',
  'update_vehicle',
  'manage_company_settings'
)
union all
select ids.company_b, ids.role_b, p.id
from sales_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_sales',
  'view_payments',
  'create_quotation',
  'update_quotation',
  'reserve_vehicle',
  'create_invoice',
  'record_payment',
  'view_vehicles',
  'update_vehicle',
  'manage_company_settings'
);

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from sales_probe_ids
union all
select company_b, user_b, role_b from sales_probe_ids;

insert into public.vehicles (
  id,
  company_id,
  branch_id,
  stock_number,
  vin,
  brand,
  model,
  year,
  selling_price,
  status
)
select vehicle_a, company_a, branch_a, 'SALES-A-001', 'SALESVINA00000001', 'Toyota', 'Hilux', 2026, 150000, 'available'::public.vehicle_status
from sales_probe_ids
union all
select vehicle_b, company_b, branch_b, 'SALES-B-001', 'SALESVINB00000001', 'Nissan', 'Patrol', 2026, 250000, 'available'::public.vehicle_status
from sales_probe_ids;

insert into public.quotations (
  company_id,
  branch_id,
  quotation_number,
  vehicle_id,
  price,
  discount,
  tax,
  status,
  created_by
)
select company_a, branch_a, 'QA-001', vehicle_a, 150000, 5000, 0, 'sent'::public.quotation_status, user_a
from sales_probe_ids
union all
select company_b, branch_b, 'QB-001', vehicle_b, 250000, 0, 0, 'sent'::public.quotation_status, user_b
from sales_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from sales_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(quotation_number order by quotation_number) from public.quotations where quotation_number like 'Q_-001'),
  array['QA-001']::text[],
  'authenticated sales viewer only sees own company quotations'
);

select lives_ok(
  $$
  insert into public.reservations (
    company_id,
    branch_id,
    reservation_number,
    quotation_id,
    vehicle_id,
    deposit_amount,
    created_by
  )
  select ids.company_a, ids.branch_a, 'RA-001', q.id, ids.vehicle_a, 10000, ids.user_a
  from sales_probe_ids ids
  join public.quotations q on q.company_id = ids.company_a and q.quotation_number = 'QA-001'
  $$,
  'sales user can reserve an available vehicle from a quotation'
);

select is(
  (select status::text from public.vehicles where stock_number = 'SALES-A-001'),
  'reserved',
  'reservation updates vehicle status to reserved'
);

insert into public.sales_invoices (
  company_id,
  branch_id,
  invoice_number,
  quotation_id,
  vehicle_id,
  final_price,
  tax,
  invoice_status,
  created_by
)
select ids.company_a, ids.branch_a, 'IA-001', q.id, ids.vehicle_a, 145000, 0, 'sent'::public.invoice_status, ids.user_a
from sales_probe_ids ids
join public.quotations q on q.company_id = ids.company_a and q.quotation_number = 'QA-001';

insert into public.payments (
  company_id,
  branch_id,
  payment_number,
  vehicle_id,
  related_invoice_id,
  payment_type,
  amount,
  payment_method,
  status,
  created_by
)
select ids.company_a, ids.branch_a, 'PA-001', ids.vehicle_a, si.id, 'partial_payment'::public.payment_type, 45000, 'cash'::public.payment_method, 'completed'::public.payment_record_status, ids.user_a
from sales_probe_ids ids
join public.sales_invoices si on si.company_id = ids.company_a and si.invoice_number = 'IA-001';

select is(
  (select balance_due from public.sales_invoices where invoice_number = 'IA-001'),
  100000::numeric,
  'payment refreshes invoice balance due'
);

reset role;

select * from finish();

rollback;

