begin;

select plan(6);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'technicians',
        'service_orders',
        'service_jobs',
        'service_labor_lines',
        'inspection_checklists',
        'inspection_results',
        'warranty_claims',
        'service_appointments'
      )
      and rowsecurity is false
  ),
  'all phase 18 service tables have RLS enabled'
);

select ok(
  exists(select 1 from public.modules where module_key = 'service')
  and exists(select 1 from public.permissions where permission_key = 'view_service')
  and exists(select 1 from public.permissions where permission_key = 'manage_service')
  and exists(select 1 from public.permissions where permission_key = 'assign_service_jobs')
  and exists(select 1 from public.permissions where permission_key = 'manage_warranty_claims'),
  'service module and permissions are seeded'
);

create temp table service_probe_ids as
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
       gen_random_uuid() as customer_a,
       gen_random_uuid() as technician_a,
       gen_random_uuid() as service_order_a,
       gen_random_uuid() as service_order_b;

grant select on service_probe_ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'service-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from service_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'service-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from service_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Service Company A', 'service-company-a' from service_probe_ids
union all
select company_b, 'Service Company B', 'service-company-b' from service_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Service Branch A', 'SVA', 'Dubai', 'AED' from service_probe_ids
union all
select branch_b, company_b, 'Service Branch B', 'SVB', 'Doha', 'QAR' from service_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from service_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from service_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from service_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from service_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Service Admin A', 'service_admin_a', 'Service role A', true from service_probe_ids
union all
select role_b, company_b, 'Service Admin B', 'service_admin_b', 'Service role B', true from service_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from service_probe_ids ids
join public.permissions p on p.permission_key in ('view_service', 'manage_service', 'assign_service_jobs', 'manage_warranty_claims', 'view_vehicles')
union all
select ids.company_b, ids.role_b, p.id
from service_probe_ids ids
join public.permissions p on p.permission_key in ('view_service', 'manage_service', 'assign_service_jobs', 'manage_warranty_claims', 'view_vehicles');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from service_probe_ids
union all
select company_b, user_b, role_b from service_probe_ids;

insert into public.customers (id, company_id, branch_id, name, customer_type, phone)
select customer_a, company_a, branch_a, 'Service Customer A', 'individual'::public.customer_type, '+971500000000'
from service_probe_ids;

insert into public.vehicles (id, company_id, branch_id, stock_number, vin, brand, model, year, selling_price, currency_code, status)
select vehicle_a, company_a, branch_a, 'SVA-001', 'SERVICEVINA001', 'Toyota', 'Hilux', 2026, 160000, 'AED', 'available'::public.vehicle_status from service_probe_ids
union all
select vehicle_b, company_b, branch_b, 'SVB-001', 'SERVICEVINB001', 'Nissan', 'Patrol', 2026, 250000, 'QAR', 'available'::public.vehicle_status from service_probe_ids;

insert into public.technicians (id, company_id, branch_id, display_name, specialization, hourly_rate, currency_code)
select technician_a, company_a, branch_a, 'Technician A', 'Diagnostics', 175, 'AED'
from service_probe_ids;

insert into public.service_orders (id, company_id, branch_id, vehicle_id, customer_id, order_number, title, complaint, status, currency_code)
select service_order_b, company_b, branch_b, vehicle_b, null, 'SO-B-001', 'Company B repair', 'Noise complaint', 'in_progress'::public.service_order_status, 'QAR'
from service_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from service_probe_ids), true);
set local role authenticated;

select is(
  (select count(*)::integer from public.service_orders where order_number = 'SO-B-001'),
  0::integer,
  'user_a cannot read company_b service orders'
);

insert into public.service_orders (id, company_id, branch_id, vehicle_id, customer_id, order_number, title, complaint, status, currency_code)
select service_order_a, company_a, branch_a, vehicle_a, customer_a, 'SO-A-001', 'Brake inspection', 'Brake vibration at speed', 'in_progress'::public.service_order_status, 'AED'
from service_probe_ids;

insert into public.service_jobs (company_id, branch_id, service_order_id, technician_id, job_number, title, labor_type, status, estimated_hours, labor_rate, labor_amount)
select company_a, branch_a, service_order_a, technician_a, 'JOB-A-001', 'Brake diagnosis', 'diagnosis'::public.service_labor_type, 'assigned'::public.service_job_status, 1.5, 175, 262.50
from service_probe_ids;

insert into public.service_labor_lines (company_id, branch_id, service_order_id, technician_id, line_number, labor_type, description, hours, hourly_rate)
select company_a, branch_a, service_order_a, technician_a, 'LAB-A-001', 'diagnosis'::public.service_labor_type, 'Initial brake diagnosis', 2, 175
from service_probe_ids;

select is(
  (select labor_total from public.service_orders where order_number = 'SO-A-001'),
  350.00::numeric,
  'labor line refreshes service order totals'
);

insert into public.inspection_results (company_id, branch_id, service_order_id, vehicle_id, technician_id, result_number, overall_status, score_percent, results)
select company_a, branch_a, service_order_a, vehicle_a, technician_a, 'INSP-A-001', 'attention'::public.inspection_result_status, 82, '{"brakes":"attention"}'::jsonb
from service_probe_ids;

insert into public.warranty_claims (company_id, branch_id, service_order_id, vehicle_id, customer_id, claim_number, provider_name, claim_amount, approved_amount, paid_amount, status)
select company_a, branch_a, service_order_a, vehicle_a, customer_a, 'WCL-A-001', 'Factory Warranty', 2000, 1500, 500, 'approved'::public.warranty_claim_status
from service_probe_ids;

select is(
  (select status::text from public.warranty_claims where claim_number = 'WCL-A-001'),
  'approved',
  'warranty claims can be created for own tenant'
);

insert into public.service_appointments (company_id, branch_id, vehicle_id, customer_id, appointment_number, title, scheduled_start, scheduled_end, status)
select company_a, branch_a, vehicle_a, customer_a, 'APT-A-001', 'Brake follow-up', now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled'::public.service_appointment_status
from service_probe_ids;

select is(
  (select status::text from public.service_appointments where appointment_number = 'APT-A-001'),
  'scheduled',
  'service appointments can be created for own tenant'
);

reset role;

select * from finish();

rollback;
