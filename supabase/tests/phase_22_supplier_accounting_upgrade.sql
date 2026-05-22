begin;

select plan(6);

select ok(
  exists(select 1 from public.modules where module_key = 'suppliers')
  and exists(select 1 from public.permissions where permission_key = 'manage_suppliers'),
  'supplier module and permission are seeded'
);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'suppliers'
      and rowsecurity is false
  ),
  'suppliers table has RLS enabled'
);

select ok(
  exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payables' and column_name = 'supplier_id')
  and exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'supplier_id'),
  'finance records can link to supplier master'
);

create temp table supplier_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as supplier_a,
       gen_random_uuid() as supplier_b;

grant select on supplier_probe_ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'supplier-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from supplier_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'supplier-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from supplier_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Supplier Company A', 'supplier-company-a' from supplier_probe_ids
union all
select company_b, 'Supplier Company B', 'supplier-company-b' from supplier_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Supplier Branch A', 'SUA', 'Dubai', 'AED' from supplier_probe_ids
union all
select branch_b, company_b, 'Supplier Branch B', 'SUB', 'Doha', 'QAR' from supplier_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from supplier_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from supplier_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from supplier_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from supplier_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Supplier Manager A', 'supplier_manager_a', 'Supplier role A', true from supplier_probe_ids
union all
select role_b, company_b, 'Supplier Manager B', 'supplier_manager_b', 'Supplier role B', true from supplier_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from supplier_probe_ids ids
join public.permissions p on p.permission_key in ('manage_suppliers', 'view_finance', 'manage_finance')
union all
select ids.company_b, ids.role_b, p.id
from supplier_probe_ids ids
join public.permissions p on p.permission_key in ('manage_suppliers', 'view_finance', 'manage_finance');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from supplier_probe_ids
union all
select company_b, user_b, role_b from supplier_probe_ids;

insert into public.suppliers (id, company_id, supplier_code, supplier_name, category, country_code, currency_code)
select supplier_b, company_b, 'SUP-B-001', 'Supplier B Hidden', 'parts'::public.supplier_category, 'QA', 'QAR'
from supplier_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from supplier_probe_ids), true);
set local role authenticated;

select is(
  (select count(*)::integer from public.suppliers where supplier_name = 'Supplier B Hidden'),
  0::integer,
  'tenant RLS hides company_b suppliers from company_a user'
);

insert into public.suppliers (id, company_id, supplier_code, supplier_name, category, country_code, currency_code)
select supplier_a, company_a, 'SUP-A-001', 'Supplier A Visible', 'logistics'::public.supplier_category, 'AE', 'AED'
from supplier_probe_ids;

select is(
  (select count(*)::integer from public.suppliers where supplier_name = 'Supplier A Visible'),
  1::integer,
  'authorized user can insert and read own supplier'
);

insert into public.payables (company_id, branch_id, supplier_id, payable_number, supplier_name, description, amount, paid_amount, balance_due, currency_code)
select company_a, branch_a, supplier_a, 'AP-SUP-A-001', 'Supplier A Visible', 'Supplier payable', 1200, 200, 1000, 'AED'
from supplier_probe_ids;

select is(
  (select sum(balance_due)::integer from public.payables p join public.suppliers s on s.id = p.supplier_id where s.supplier_name = 'Supplier A Visible'),
  1000::integer,
  'payables link to supplier master'
);

select * from finish();

rollback;
