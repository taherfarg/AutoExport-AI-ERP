begin;

select plan(7);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'destination_countries',
        'logistics_partners',
        'export_orders',
        'import_orders',
        'shipping_events',
        'customs_clearance',
        'export_documents',
        'shipment_costs'
      )
      and rowsecurity is false
  ),
  'all phase 5 import/export tables have RLS enabled'
);

select is(
  (select count(*)::integer from public.destination_countries where country_code in ('DZ', 'EG', 'LY', 'GH', 'BE', 'QA', 'OM', 'SA')),
  8,
  'global and GCC destination countries are seeded'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'view_exports'),
  'view_exports permission exists'
);

create temp table export_probe_ids as
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

grant select on export_probe_ids to authenticated;

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
       'export-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from export_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'export-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from export_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Export Company A', 'export-company-a' from export_probe_ids
union all
select company_b, 'Export Company B', 'export-company-b' from export_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'Export Branch A', 'EXA', 'Dubai' from export_probe_ids
union all
select branch_b, company_b, 'Export Branch B', 'EXB', 'Doha' from export_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from export_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from export_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Export Manager A', 'export_manager_a', 'Export manager test role.', true from export_probe_ids
union all
select role_b, company_b, 'Export Manager B', 'export_manager_b', 'Export manager test role.', true from export_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from export_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_exports',
  'manage_exports',
  'update_export_status',
  'manage_logistics_partners',
  'view_vehicles',
  'manage_company_settings'
)
union all
select ids.company_b, ids.role_b, p.id
from export_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_exports',
  'manage_exports',
  'update_export_status',
  'manage_logistics_partners',
  'view_vehicles',
  'manage_company_settings'
);

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from export_probe_ids
union all
select company_b, user_b, role_b from export_probe_ids;

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
  status,
  export_available
)
select vehicle_a, company_a, branch_a, 'EXPORT-A-001', 'EXPORTVINA0000001', 'Toyota', 'Prado', 2026, 220000, 'available'::public.vehicle_status, true
from export_probe_ids
union all
select vehicle_b, company_b, branch_b, 'EXPORT-B-001', 'EXPORTVINB0000001', 'Nissan', 'Patrol', 2026, 280000, 'available'::public.vehicle_status, true
from export_probe_ids;

insert into public.export_orders (
  company_id,
  branch_id,
  export_order_number,
  vehicle_id,
  destination_country_code,
  destination_port,
  shipping_method,
  shipping_status,
  customs_status,
  document_status,
  created_by
)
select company_a, branch_a, 'EX-A-001', vehicle_a, 'DZ', 'Algiers', 'container'::public.shipping_method, 'waiting_booking'::public.shipping_status, 'not_started'::public.customs_status, 'missing'::public.export_document_status, user_a
from export_probe_ids
union all
select company_b, branch_b, 'EX-B-001', vehicle_b, 'QA', 'Hamad Port', 'ro_ro'::public.shipping_method, 'waiting_booking'::public.shipping_status, 'not_started'::public.customs_status, 'missing'::public.export_document_status, user_b
from export_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from export_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(export_order_number order by export_order_number) from public.export_orders where export_order_number like 'EX-_-%'),
  array['EX-A-001']::text[],
  'authenticated export viewer only sees own company export orders'
);

select lives_ok(
  $$
  insert into public.shipping_events (
    company_id,
    branch_id,
    export_order_id,
    event_status,
    location,
    notes,
    created_by
  )
  select ids.company_a, ids.branch_a, eo.id, 'booked'::public.shipping_status, 'Jebel Ali', 'Booking confirmed', ids.user_a
  from export_probe_ids ids
  join public.export_orders eo on eo.company_id = ids.company_a and eo.export_order_number = 'EX-A-001'
  $$,
  'export status updater can add shipping event'
);

select is(
  (select shipping_status::text from public.export_orders where export_order_number = 'EX-A-001'),
  'booked',
  'shipping event refreshes export order shipping status'
);

insert into public.shipment_costs (
  company_id,
  branch_id,
  export_order_id,
  cost_type,
  description,
  amount,
  currency_code,
  created_by
)
select ids.company_a, ids.branch_a, eo.id, 'ocean_freight'::public.shipment_cost_type, 'Freight charge', 9000, 'AED', ids.user_a
from export_probe_ids ids
join public.export_orders eo on eo.company_id = ids.company_a and eo.export_order_number = 'EX-A-001';

select is(
  (select sum(amount) from public.shipment_costs where company_id = (select company_a from export_probe_ids)),
  9000::numeric,
  'shipment costs roll up by company/export order'
);

reset role;

select * from finish();

rollback;

