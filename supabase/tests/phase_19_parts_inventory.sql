begin;

select plan(8);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'part_suppliers',
        'parts',
        'part_stock',
        'part_purchase_orders',
        'part_purchase_order_items',
        'part_receipts',
        'part_receipt_items',
        'part_transfers',
        'service_parts_lines',
        'part_reorder_alerts'
      )
      and rowsecurity is false
  ),
  'all phase 19 parts tables have RLS enabled'
);

select ok(
  exists(select 1 from public.modules where module_key = 'parts')
  and exists(select 1 from public.permissions where permission_key = 'view_parts')
  and exists(select 1 from public.permissions where permission_key = 'manage_parts')
  and exists(select 1 from public.permissions where permission_key = 'manage_part_orders')
  and exists(select 1 from public.permissions where permission_key = 'transfer_parts'),
  'parts module and permissions are seeded'
);

create temp table parts_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_a_2,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as vehicle_a,
       gen_random_uuid() as customer_a,
       gen_random_uuid() as service_order_a,
       gen_random_uuid() as service_job_a,
       gen_random_uuid() as supplier_a,
       gen_random_uuid() as supplier_b,
       gen_random_uuid() as part_a,
       gen_random_uuid() as part_b,
       gen_random_uuid() as po_a;

grant select on parts_probe_ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'parts-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from parts_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'parts-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from parts_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Parts Company A', 'parts-company-a' from parts_probe_ids
union all
select company_b, 'Parts Company B', 'parts-company-b' from parts_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Parts Branch A', 'PTA', 'Dubai', 'AED' from parts_probe_ids
union all
select branch_a_2, company_a, 'Parts Branch A2', 'PTA2', 'Abu Dhabi', 'AED' from parts_probe_ids
union all
select branch_b, company_b, 'Parts Branch B', 'PTB', 'Doha', 'QAR' from parts_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from parts_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from parts_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from parts_probe_ids
union all
select company_a, branch_a_2, user_a, 'active'::public.member_status from parts_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from parts_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Parts Admin A', 'parts_admin_a', 'Parts role A', true from parts_probe_ids
union all
select role_b, company_b, 'Parts Admin B', 'parts_admin_b', 'Parts role B', true from parts_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from parts_probe_ids ids
join public.permissions p on p.permission_key in ('view_parts', 'manage_parts', 'manage_part_orders', 'transfer_parts', 'view_service', 'manage_service', 'view_vehicles')
union all
select ids.company_b, ids.role_b, p.id
from parts_probe_ids ids
join public.permissions p on p.permission_key in ('view_parts', 'manage_parts', 'manage_part_orders', 'transfer_parts', 'view_service', 'manage_service', 'view_vehicles');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from parts_probe_ids
union all
select company_b, user_b, role_b from parts_probe_ids;

insert into public.customers (id, company_id, branch_id, name, customer_type, phone)
select customer_a, company_a, branch_a, 'Parts Customer A', 'individual'::public.customer_type, '+971500000001'
from parts_probe_ids;

insert into public.vehicles (id, company_id, branch_id, stock_number, vin, brand, model, year, selling_price, currency_code, status)
select vehicle_a, company_a, branch_a, 'PTA-001', 'PARTSVINA001', 'Lexus', 'LX 600', 2026, 520000, 'AED', 'available'::public.vehicle_status
from parts_probe_ids;

insert into public.service_orders (id, company_id, branch_id, vehicle_id, customer_id, order_number, title, status, currency_code)
select service_order_a, company_a, branch_a, vehicle_a, customer_a, 'SO-PARTS-A-001', 'LX service', 'in_progress'::public.service_order_status, 'AED'
from parts_probe_ids;

insert into public.service_jobs (id, company_id, branch_id, service_order_id, job_number, title, status)
select service_job_a, company_a, branch_a, service_order_a, 'JOB-PARTS-A-001', 'Filter replacement', 'assigned'::public.service_job_status
from parts_probe_ids;

insert into public.part_suppliers (id, company_id, supplier_name, country_code, contact_name, email, phone)
select supplier_b, company_b, 'Company B Parts Supplier', 'QA', 'Supplier B', 'b@example.test', '+97450000000'
from parts_probe_ids;

insert into public.parts (id, company_id, part_number, sku, name, category, brand, unit_cost, selling_price, currency_code, reorder_point, reorder_quantity)
select part_b, company_b, 'B-FILTER-001', 'B-FILTER-001', 'Company B Filter', 'Engine', 'Toyota', 90, 140, 'QAR', 2, 10
from parts_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from parts_probe_ids), true);
set local role authenticated;

select is(
  (select count(*)::integer from public.parts where part_number = 'B-FILTER-001'),
  0::integer,
  'user_a cannot read company_b parts'
);

insert into public.part_suppliers (id, company_id, supplier_name, country_code, contact_name, email, phone)
select supplier_a, company_a, 'Gulf Genuine Parts', 'AE', 'Parts Desk', 'parts@example.test', '+971500000002'
from parts_probe_ids;

insert into public.parts (id, company_id, part_number, sku, name, category, brand, unit_cost, selling_price, currency_code, reorder_point, reorder_quantity)
select part_a, company_a, 'LX-FILTER-001', 'LX-FILTER-001', 'LX 600 Oil Filter', 'Engine', 'Lexus', 120, 185, 'AED', 3, 10
from parts_probe_ids;

insert into public.part_purchase_orders (id, company_id, branch_id, supplier_id, purchase_order_number, status, currency_code)
select po_a, company_a, branch_a, supplier_a, 'PPO-A-001', 'ordered'::public.part_order_status, 'AED'
from parts_probe_ids;

insert into public.part_purchase_order_items (company_id, purchase_order_id, part_id, description, quantity_ordered, unit_cost)
select company_a, po_a, part_a, 'LX 600 Oil Filter', 5, 120
from parts_probe_ids;

select is(
  (select total_amount from public.part_purchase_orders where purchase_order_number = 'PPO-A-001'),
  600.00::numeric,
  'purchase order item refreshes purchase order totals'
);

insert into public.part_receipts (company_id, branch_id, purchase_order_id, receipt_number, status, received_at)
select company_a, branch_a, po_a, 'PRC-A-001', 'posted'::public.part_receipt_status, now()
from parts_probe_ids;

insert into public.part_receipt_items (company_id, part_receipt_id, purchase_order_item_id, part_id, quantity_received, unit_cost)
select ids.company_a, r.id, poi.id, ids.part_a, 5, 120
from parts_probe_ids ids
join public.part_receipts r on r.company_id = ids.company_a and r.receipt_number = 'PRC-A-001'
join public.part_purchase_order_items poi on poi.company_id = ids.company_a and poi.purchase_order_id = ids.po_a;

select is(
  (select quantity_on_hand from public.part_stock where part_id = (select part_a from parts_probe_ids) and branch_id = (select branch_a from parts_probe_ids)),
  5::numeric,
  'posted receipt increases branch stock'
);

insert into public.service_parts_lines (company_id, branch_id, service_order_id, service_job_id, part_id, line_number, description, quantity, unit_cost, selling_price, status)
select company_a, branch_a, service_order_a, service_job_a, part_a, 'SPL-A-001', 'Oil filter replacement', 2, 120, 185, 'used'::public.service_part_line_status
from parts_probe_ids;

select is(
  (select quantity_on_hand from public.part_stock where part_id = (select part_a from parts_probe_ids) and branch_id = (select branch_a from parts_probe_ids)),
  3::numeric,
  'used service part decreases branch stock'
);

select is(
  (select parts_total from public.service_orders where order_number = 'SO-PARTS-A-001'),
  370.00::numeric,
  'used service part refreshes service order parts total'
);

insert into public.part_transfers (company_id, part_id, from_branch_id, to_branch_id, transfer_number, quantity, status)
select company_a, part_a, branch_a, branch_a_2, 'PTR-A-001', 1, 'received'::public.part_transfer_status
from parts_probe_ids;

select is(
  (select quantity_on_hand from public.part_stock where part_id = (select part_a from parts_probe_ids) and branch_id = (select branch_a_2 from parts_probe_ids)),
  1::numeric,
  'received transfer increases destination branch stock'
);

reset role;

select * from finish();

rollback;
