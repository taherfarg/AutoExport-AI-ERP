begin;

select plan(6);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in ('billing_customers', 'billing_events', 'usage_counters', 'usage_limit_events')
      and rowsecurity is false
  ),
  'all phase 15 billing tables have RLS enabled'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'view_billing'),
  'view_billing permission is seeded'
);

create temp table billing_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b;

grant select on billing_probe_ids to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'billing-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from billing_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'billing-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from billing_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Billing Company A', 'billing-company-a' from billing_probe_ids
union all
select company_b, 'Billing Company B', 'billing-company-b' from billing_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from billing_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from billing_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Billing Admin A', 'billing_admin_a', 'Billing role A', true from billing_probe_ids
union all
select role_b, company_b, 'Billing Admin B', 'billing_admin_b', 'Billing role B', true from billing_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from billing_probe_ids ids
join public.permissions p on p.permission_key in ('view_billing', 'manage_subscriptions')
union all
select ids.company_b, ids.role_b, p.id
from billing_probe_ids ids
join public.permissions p on p.permission_key in ('view_billing', 'manage_subscriptions');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from billing_probe_ids
union all
select company_b, user_b, role_b from billing_probe_ids;

insert into public.billing_customers (company_id, provider, provider_customer_id, billing_email, billing_name, status)
select company_b, 'stripe'::public.billing_provider, 'cus_company_b', 'billing-b@example.test', 'Company B', 'active'::public.billing_customer_status
from billing_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from billing_probe_ids), true);
set local role authenticated;

select is(
  (select count(*)::integer from public.billing_customers where provider_customer_id = 'cus_company_b'),
  0::integer,
  'user_a cannot read company_b billing customer'
);

insert into public.billing_customers (company_id, provider, provider_customer_id, billing_email, billing_name, status)
select company_a, 'stripe'::public.billing_provider, 'cus_company_a', 'billing-a@example.test', 'Company A', 'active'::public.billing_customer_status
from billing_probe_ids;

select is(
  (select status::text from public.billing_customers where provider_customer_id = 'cus_company_a'),
  'active',
  'user_a can manage own billing customer with manage_subscriptions'
);

insert into public.billing_events (company_id, provider, provider_event_id, event_type, event_status, payload, processed_at)
select company_a, 'stripe'::public.billing_provider, 'evt_phase15_a', 'checkout.session.completed', 'processed'::public.billing_event_status, '{"ok": true}'::jsonb, now()
from billing_probe_ids;

select throws_ok(
  $$insert into public.billing_events (company_id, provider, provider_event_id, event_type) select company_a, 'stripe'::public.billing_provider, 'evt_phase15_a', 'invoice.paid' from billing_probe_ids$$,
  '23505',
  null,
  'billing event provider ids are idempotent'
);

insert into public.usage_counters (company_id, metric_key, period_start, period_end, current_value, limit_value, source_table)
select company_a, 'vehicles', current_date, current_date + 30, 101, 100, 'vehicles'
from billing_probe_ids;

insert into public.usage_limit_events (company_id, metric_key, event_type, current_value, limit_value, message)
select company_a, 'vehicles', 'blocked'::public.usage_limit_event_type, 101, 100, 'Vehicle limit exceeded'
from billing_probe_ids;

select is(
  (select event_type::text from public.usage_limit_events where metric_key = 'vehicles'),
  'blocked',
  'usage limit events record exceeded limits'
);

reset role;

select * from finish();

rollback;
