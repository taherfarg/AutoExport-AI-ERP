begin;

select plan(6);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'vin_decode_requests',
        'vehicle_market_values',
        'vehicle_competitor_prices',
        'vehicle_history_reports',
        'vehicle_enrichment_logs'
      )
      and rowsecurity is false
  ),
  'all phase 12 vehicle intelligence tables have RLS enabled'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'manage_vehicle_intelligence'),
  'vehicle intelligence permission exists'
);

select ok(
  exists(select 1 from public.vehicle_market_values where provider = 'manual_seed'),
  'seed vehicle market valuation exists'
);

create temp table intelligence_probe_ids as
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
       gen_random_uuid() as decode_a,
       gen_random_uuid() as decode_b;

grant select on intelligence_probe_ids to authenticated;

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
       'intel-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from intelligence_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'intel-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from intelligence_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Intelligence Company A', 'intelligence-company-a' from intelligence_probe_ids
union all
select company_b, 'Intelligence Company B', 'intelligence-company-b' from intelligence_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'Intelligence Branch A', 'INA', 'Dubai' from intelligence_probe_ids
union all
select branch_b, company_b, 'Intelligence Branch B', 'INB', 'Doha' from intelligence_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from intelligence_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from intelligence_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from intelligence_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from intelligence_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Intelligence Manager A', 'intelligence_manager_a', 'Vehicle intelligence manager test role.', true from intelligence_probe_ids
union all
select role_b, company_b, 'Intelligence Manager B', 'intelligence_manager_b', 'Vehicle intelligence manager test role.', true from intelligence_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from intelligence_probe_ids ids
join public.permissions p on p.permission_key in ('view_vehicles', 'create_vehicle', 'manage_vehicle_intelligence')
union all
select ids.company_b, ids.role_b, p.id
from intelligence_probe_ids ids
join public.permissions p on p.permission_key in ('view_vehicles', 'create_vehicle', 'manage_vehicle_intelligence');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from intelligence_probe_ids
union all
select company_b, user_b, role_b from intelligence_probe_ids;

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
  created_by,
  updated_by
)
select vehicle_a, company_a, branch_a, 'INT-A-001', 'JT123456789012345', 'Toyota', 'Hilux', 2026, 150000, user_a, user_a
from intelligence_probe_ids
union all
select vehicle_b, company_b, branch_b, 'INT-B-001', 'WP123456789012345', 'Porsche', 'Cayenne', 2025, 390000, user_b, user_b
from intelligence_probe_ids;

insert into public.vin_decode_requests (
  id,
  company_id,
  branch_id,
  vehicle_id,
  vin,
  provider,
  status,
  decoded_brand,
  decoded_model,
  decoded_year,
  requested_by,
  created_by,
  updated_by
)
select decode_a, company_a, branch_a, vehicle_a, 'JT123456789012345', 'manual', 'completed'::public.vehicle_intelligence_provider_status, 'Toyota', 'Hilux', 2026, user_a, user_a, user_a
from intelligence_probe_ids
union all
select decode_b, company_b, branch_b, vehicle_b, 'WP123456789012345', 'manual', 'completed'::public.vehicle_intelligence_provider_status, 'Porsche', 'Cayenne', 2025, user_b, user_b, user_b
from intelligence_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from intelligence_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(vin order by vin) from public.vin_decode_requests where provider = 'manual'),
  array['JT123456789012345']::text[],
  'vehicle intelligence RLS only exposes current company VIN decode records'
);

insert into public.vehicle_market_values (
  company_id,
  branch_id,
  vehicle_id,
  provider,
  market_low,
  market_average,
  market_high,
  recommended_price,
  sample_size,
  created_by,
  updated_by
)
select company_a, branch_a, vehicle_a, 'manual', 132000, 145000, 158000, 146000, 3, user_a, user_a
from intelligence_probe_ids;

select is(
  (select recommended_price::integer from public.vehicle_market_values where provider = 'manual'),
  146000,
  'authorized user can create market valuation records'
);

insert into public.vehicle_enrichment_logs (
  company_id,
  branch_id,
  vehicle_id,
  event_type,
  source_table,
  title,
  created_by
)
select company_a, branch_a, vehicle_a, 'market_valuation'::public.vehicle_enrichment_event_type, 'vehicle_market_values', 'Manual valuation saved', user_a
from intelligence_probe_ids;

select is(
  (select title from public.vehicle_enrichment_logs where title = 'Manual valuation saved'),
  'Manual valuation saved',
  'authorized user can create enrichment log records'
);

reset role;

select * from finish();

rollback;
