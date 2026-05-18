begin;

select plan(5);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'vehicles',
        'vehicle_costs',
        'vehicle_photos',
        'vehicle_documents',
        'vehicle_status_history',
        'vehicle_branch_movements',
        'vehicle_price_history'
      )
      and rowsecurity is false
  ),
  'all phase 2a vehicle tables have RLS enabled'
);

select is(
  public.calculate_vehicle_total_landed_cost(100000, 7000, 12000, 2500, 900, 600),
  123000::numeric,
  'vehicle landed cost calculation adds all cost inputs'
);

create temp table vehicle_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b;

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
       'vehicle-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from vehicle_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'vehicle-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from vehicle_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Vehicle RLS Company A', 'vehicle-rls-company-a' from vehicle_probe_ids
union all
select company_b, 'Vehicle RLS Company B', 'vehicle-rls-company-b' from vehicle_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'Vehicle Branch A', 'VBA', 'Dubai' from vehicle_probe_ids
union all
select branch_b, company_b, 'Vehicle Branch B', 'VBB', 'Doha' from vehicle_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from vehicle_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from vehicle_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Vehicle Manager A', 'vehicle_manager_a', 'Vehicle manager test role.', true from vehicle_probe_ids
union all
select role_b, company_b, 'Vehicle Manager B', 'vehicle_manager_b', 'Vehicle manager test role.', true from vehicle_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from vehicle_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_vehicles',
  'create_vehicle',
  'update_vehicle',
  'delete_vehicle',
  'view_vehicle_cost',
  'view_vehicle_profit',
  'manage_company_settings'
)
union all
select ids.company_b, ids.role_b, p.id
from vehicle_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_vehicles',
  'create_vehicle',
  'update_vehicle',
  'delete_vehicle',
  'view_vehicle_cost',
  'view_vehicle_profit',
  'manage_company_settings'
);

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from vehicle_probe_ids
union all
select company_b, user_b, role_b from vehicle_probe_ids;

insert into public.vehicles (
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
select company_a, branch_a, 'TEST-A-001', 'TESTVINA000000001', 'Toyota', 'Hilux', 2025, 100000, 7000, 12000, 150000, 'available'::public.vehicle_status
from vehicle_probe_ids
union all
select company_b, branch_b, 'TEST-B-001', 'TESTVINB000000001', 'Lexus', 'LX 600', 2025, 300000, 12000, 40000, 430000, 'available'::public.vehicle_status
from vehicle_probe_ids;

select lives_ok(
  $$
  insert into public.vehicles (
    company_id,
    branch_id,
    stock_number,
    vin,
    brand,
    model,
    year
  )
  select company_b, branch_b, 'TEST-A-001', 'TESTVINA000000001', 'Nissan', 'Patrol', 2025
  from vehicle_probe_ids
  $$,
  'stock number and VIN can repeat across different companies'
);

select throws_ok(
  $$
  insert into public.vehicles (
    company_id,
    branch_id,
    stock_number,
    vin,
    brand,
    model,
    year
  )
  select company_a, branch_a, 'TEST-A-001', 'TESTVINA000000099', 'Ford', 'Ranger', 2025
  from vehicle_probe_ids
  $$,
  '23505',
  null,
  'stock number is unique inside a company'
);

select set_config('request.jwt.claim.sub', (select user_a::text from vehicle_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(stock_number order by stock_number) from public.vehicles where stock_number like 'TEST-%'),
  array['TEST-A-001']::text[],
  'authenticated vehicle viewer only sees own company vehicles'
);

reset role;

select * from finish();

rollback;

