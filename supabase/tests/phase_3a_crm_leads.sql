begin;

select plan(6);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'customers',
        'leads',
        'lead_messages',
        'follow_ups',
        'opportunities',
        'customer_notes'
      )
      and rowsecurity is false
  ),
  'all phase 3a CRM tables have RLS enabled'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'view_leads'),
  'view_leads permission exists'
);

select ok(
  exists(select 1 from public.leads where name = 'Algeria Auto Dealer'),
  'seed CRM lead exists'
);

create temp table crm_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b;

grant select on crm_probe_ids to authenticated;

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
       'crm-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from crm_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'crm-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from crm_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'CRM Company A', 'crm-company-a' from crm_probe_ids
union all
select company_b, 'CRM Company B', 'crm-company-b' from crm_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'CRM Branch A', 'CRMA', 'Dubai' from crm_probe_ids
union all
select branch_b, company_b, 'CRM Branch B', 'CRMB', 'Riyadh' from crm_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from crm_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from crm_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'CRM Manager A', 'crm_manager_a', 'CRM manager test role.', true from crm_probe_ids
union all
select role_b, company_b, 'CRM Manager B', 'crm_manager_b', 'CRM manager test role.', true from crm_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from crm_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_customers',
  'create_customer',
  'update_customer',
  'view_leads',
  'view_all_leads',
  'create_lead',
  'update_lead',
  'create_follow_up',
  'update_follow_up',
  'manage_company_settings'
)
union all
select ids.company_b, ids.role_b, p.id
from crm_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_customers',
  'create_customer',
  'update_customer',
  'view_leads',
  'view_all_leads',
  'create_lead',
  'update_lead',
  'create_follow_up',
  'update_follow_up',
  'manage_company_settings'
);

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from crm_probe_ids
union all
select company_b, user_b, role_b from crm_probe_ids;

insert into public.leads (
  company_id,
  branch_id,
  name,
  customer_type,
  phone,
  preferred_brand,
  preferred_model,
  lead_source,
  status,
  assigned_salesperson_id,
  created_by
)
select company_a, branch_a, 'CRM Lead A', 'dealer'::public.customer_type, '+971500000001', 'Toyota', 'Hilux', 'website'::public.lead_source_type, 'new'::public.lead_status, user_a, user_a
from crm_probe_ids
union all
select company_b, branch_b, 'CRM Lead B', 'dealer'::public.customer_type, '+974500000001', 'Nissan', 'Patrol', 'website'::public.lead_source_type, 'new'::public.lead_status, user_b, user_b
from crm_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from crm_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(name order by name) from public.leads where name like 'CRM Lead %'),
  array['CRM Lead A']::text[],
  'authenticated CRM viewer only sees own company leads'
);

select lives_ok(
  $$
  insert into public.follow_ups (
    company_id,
    branch_id,
    lead_id,
    assigned_to,
    title,
    due_at,
    created_by
  )
  select company_a, branch_a, l.id, user_a, 'Call buyer', now() + interval '1 day', user_a
  from crm_probe_ids ids
  join public.leads l on l.company_id = ids.company_a and l.name = 'CRM Lead A'
  $$,
  'CRM user can create a follow-up for a visible lead'
);

select is(
  (select count(*)::integer from public.follow_ups where title = 'Call buyer'),
  1,
  'follow-up is readable after insert'
);

reset role;

select * from finish();

rollback;
