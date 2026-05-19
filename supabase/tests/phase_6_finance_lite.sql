begin;

select plan(7);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'payment_methods',
        'bank_accounts',
        'cash_accounts',
        'expenses',
        'receivables',
        'payables',
        'vehicle_profit_snapshots',
        'branch_profit_snapshots',
        'salesperson_commissions'
      )
      and rowsecurity is false
  ),
  'all phase 6 finance tables have RLS enabled'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'manage_finance')
  and exists(select 1 from public.permissions where permission_key = 'manage_commissions'),
  'phase 6 finance permissions exist'
);

create temp table finance_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as vehicle_a,
       gen_random_uuid() as vehicle_b,
       gen_random_uuid() as invoice_a;

grant select on finance_probe_ids to authenticated;

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
       'finance-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from finance_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'finance-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from finance_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Finance Company A', 'finance-company-a' from finance_probe_ids
union all
select company_b, 'Finance Company B', 'finance-company-b' from finance_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Finance Branch A', 'FNA', 'Dubai', 'AED' from finance_probe_ids
union all
select branch_b, company_b, 'Finance Branch B', 'FNB', 'Doha', 'QAR' from finance_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from finance_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from finance_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from finance_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from finance_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Finance Manager A', 'finance_manager_a', 'Finance manager test role.', true from finance_probe_ids
union all
select role_b, company_b, 'Finance Manager B', 'finance_manager_b', 'Finance manager test role.', true from finance_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from finance_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_finance',
  'manage_finance',
  'manage_commissions',
  'create_invoice',
  'view_sales',
  'record_payment',
  'view_payments',
  'view_vehicles',
  'manage_company_settings'
)
union all
select ids.company_b, ids.role_b, p.id
from finance_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_finance',
  'manage_finance',
  'manage_commissions',
  'create_invoice',
  'view_sales',
  'record_payment',
  'view_payments',
  'view_vehicles',
  'manage_company_settings'
);

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from finance_probe_ids
union all
select company_b, user_b, role_b from finance_probe_ids;

insert into public.vehicles (
  id,
  company_id,
  branch_id,
  stock_number,
  vin,
  brand,
  model,
  year,
  purchase_price,
  shipping_cost,
  customs_cost,
  selling_price,
  status
)
select vehicle_a, company_a, branch_a, 'FIN-A-001', 'FINANCEVINA000001', 'Toyota', 'Prado', 2026, 120000, 8000, 12000, 180000, 'available'::public.vehicle_status
from finance_probe_ids
union all
select vehicle_b, company_b, branch_b, 'FIN-B-001', 'FINANCEVINB000001', 'Nissan', 'Patrol', 2026, 130000, 9000, 13000, 190000, 'available'::public.vehicle_status
from finance_probe_ids;

insert into public.expenses (
  company_id,
  branch_id,
  expense_number,
  category,
  description,
  amount,
  currency_code,
  created_by
)
select company_a, branch_a, 'EXP-FIN-A-001', 'repair'::public.finance_expense_category, 'Paint repair', 2500, 'AED', user_a
from finance_probe_ids
union all
select company_b, branch_b, 'EXP-FIN-B-001', 'repair'::public.finance_expense_category, 'Paint repair', 3500, 'QAR', user_b
from finance_probe_ids;

insert into public.payables (
  company_id,
  branch_id,
  vehicle_id,
  payable_number,
  supplier_name,
  description,
  amount,
  paid_amount,
  currency_code,
  due_date,
  created_by
)
select company_a, branch_a, vehicle_a, 'AP-FIN-A-001', 'Repair Supplier', 'Repair payable', 5000, 2000, 'AED', current_date + 5, user_a
from finance_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from finance_probe_ids), true);
set local role authenticated;

select lives_ok(
  $$
  insert into public.sales_invoices (
    id,
    company_id,
    branch_id,
    invoice_number,
    vehicle_id,
    final_price,
    tax,
    currency_code,
    due_date,
    created_by,
    updated_by
  )
  select invoice_a, company_a, branch_a, 'INV-FIN-A-001', vehicle_a, 180000, 0, 'AED', current_date + 7, user_a, user_a
  from finance_probe_ids
  $$,
  'finance manager can create a sales invoice for receivable sync'
);

select is(
  (select balance_due from public.receivables where receivable_number = 'AR-INV-FIN-A-001'),
  180000::numeric,
  'invoice creates matching receivable balance'
);

select is(
  (select array_agg(expense_number order by expense_number) from public.expenses where expense_number like 'EXP-FIN-%'),
  array['EXP-FIN-A-001']::text[],
  'finance RLS only exposes expenses for the current company'
);

select is(
  (select status::text from public.payables where payable_number = 'AP-FIN-A-001'),
  'partial',
  'payable balance trigger derives partial status'
);

insert into public.salesperson_commissions (
  company_id,
  branch_id,
  salesperson_id,
  sales_invoice_id,
  vehicle_id,
  commission_number,
  basis_amount,
  commission_rate,
  currency_code,
  created_by
)
select company_a, branch_a, user_a, invoice_a, vehicle_a, 'COM-FIN-A-001', 180000, 2.5, 'AED', user_a
from finance_probe_ids;

select is(
  (select commission_amount from public.salesperson_commissions where commission_number = 'COM-FIN-A-001'),
  4500::numeric,
  'commission trigger calculates amount from basis and rate'
);

reset role;

select * from finish();

rollback;
