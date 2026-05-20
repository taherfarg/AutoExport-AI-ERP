begin;

select plan(6);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in ('deals', 'deal_products', 'finance_applications', 'lenders', 'lender_submissions', 'insurance_products', 'warranty_products', 'deal_approvals')
      and rowsecurity is false
  ),
  'all phase 16 F&I tables have RLS enabled'
);

select ok(
  exists(select 1 from public.modules where module_key = 'deal_desk')
  and exists(select 1 from public.permissions where permission_key = 'manage_deals')
  and exists(select 1 from public.permissions where permission_key = 'approve_deals'),
  'deal desk module and permissions are seeded'
);

create temp table deal_probe_ids as
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
       gen_random_uuid() as lender_a,
       gen_random_uuid() as deal_a;

grant select on deal_probe_ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'deal-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from deal_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'deal-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from deal_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Deal Company A', 'deal-company-a' from deal_probe_ids
union all
select company_b, 'Deal Company B', 'deal-company-b' from deal_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Deal Branch A', 'DBA', 'Dubai', 'AED' from deal_probe_ids
union all
select branch_b, company_b, 'Deal Branch B', 'DBB', 'Doha', 'QAR' from deal_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from deal_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from deal_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from deal_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from deal_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Deal Admin A', 'deal_admin_a', 'Deal role A', true from deal_probe_ids
union all
select role_b, company_b, 'Deal Admin B', 'deal_admin_b', 'Deal role B', true from deal_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from deal_probe_ids ids
join public.permissions p on p.permission_key in ('view_deals', 'manage_deals', 'approve_deals', 'view_vehicles')
union all
select ids.company_b, ids.role_b, p.id
from deal_probe_ids ids
join public.permissions p on p.permission_key in ('view_deals', 'manage_deals', 'approve_deals', 'view_vehicles');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from deal_probe_ids
union all
select company_b, user_b, role_b from deal_probe_ids;

insert into public.vehicles (id, company_id, branch_id, stock_number, vin, brand, model, year, selling_price, currency_code, status)
select vehicle_a, company_a, branch_a, 'DA-001', 'DEALVINA001', 'Toyota', 'Prado', 2026, 210000, 'AED', 'available'::public.vehicle_status from deal_probe_ids
union all
select vehicle_b, company_b, branch_b, 'DB-001', 'DEALVINB001', 'Nissan', 'Patrol', 2026, 250000, 'QAR', 'available'::public.vehicle_status from deal_probe_ids;

insert into public.lenders (id, company_id, branch_id, name, lender_type, country_code, base_rate)
select lender_a, company_a, branch_a, 'Company A Finance', 'bank'::public.lender_type, 'AE', 4.5 from deal_probe_ids;

insert into public.deals (
  id, company_id, branch_id, deal_number, vehicle_id, deal_type, vehicle_price, down_payment,
  finance_amount, term_months, annual_interest_rate, monthly_payment, total_payable, currency_code
)
select deal_a, company_b, branch_b, 'D-B-001', vehicle_b, 'finance'::public.deal_type, 250000, 50000, 200000, 60, 4.9, 3765, 225900, 'QAR'
from deal_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from deal_probe_ids), true);
set local role authenticated;

select is(
  (select count(*)::integer from public.deals where deal_number = 'D-B-001'),
  0::integer,
  'user_a cannot read company_b deals'
);

insert into public.deals (
  company_id, branch_id, deal_number, vehicle_id, deal_type, vehicle_price, down_payment,
  finance_amount, term_months, annual_interest_rate, monthly_payment, total_payable, currency_code
)
select company_a, branch_a, 'D-A-001', vehicle_a, 'finance'::public.deal_type, 210000, 30000, 180000, 60, 4.5, 3356.0, 201360, 'AED'
from deal_probe_ids;

select is(
  (select finance_amount from public.deals where deal_number = 'D-A-001'),
  180000::numeric,
  'user_a can create own company deal'
);

insert into public.finance_applications (
  company_id, branch_id, deal_id, lender_id, application_number, applicant_name, requested_amount, down_payment, term_months, annual_interest_rate, status
)
select company_a, branch_a, d.id, lender_a, 'FA-A-001', 'Finance Buyer A', 180000, 30000, 60, 4.5, 'submitted'::public.finance_application_status
from deal_probe_ids ids
join public.deals d on d.company_id = ids.company_a and d.deal_number = 'D-A-001';

select is(
  (select status::text from public.finance_applications where application_number = 'FA-A-001'),
  'submitted',
  'finance applications can be created for own tenant'
);

insert into public.deal_approvals (company_id, deal_id, approval_number, approval_type, status, requested_by)
select company_a, d.id, 'APP-A-001', 'manager', 'pending'::public.deal_approval_status, user_a
from deal_probe_ids ids
join public.deals d on d.company_id = ids.company_a and d.deal_number = 'D-A-001';

update public.deal_approvals
set status = 'approved'::public.deal_approval_status,
    decided_by = (select user_a from deal_probe_ids),
    decided_at = now()
where approval_number = 'APP-A-001';

select is(
  (select status::text from public.deal_approvals where approval_number = 'APP-A-001'),
  'approved',
  'approve_deals can approve a pending deal'
);

reset role;

select * from finish();

rollback;
