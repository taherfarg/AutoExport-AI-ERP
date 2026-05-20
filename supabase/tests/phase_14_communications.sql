begin;

select plan(7);

-- 1. Verify RLS is enabled on all new tables
select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'communication_providers',
        'message_templates',
        'customer_consents',
        'outbound_messages',
        'message_delivery_events'
      )
      and rowsecurity is false
  ),
  'all phase 14 tables have RLS enabled'
);

-- 2. Verify default templates and providers are seeded
select ok(
  exists(select 1 from public.communication_providers where provider_type = 'whatsapp')
  and exists(select 1 from public.message_templates where name = 'Lead Welcome WhatsApp'),
  'default templates and providers are seeded'
);

-- Setup temp table with probe IDs
create temp table comms_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as lead_a,
       gen_random_uuid() as lead_b;

grant select on comms_probe_ids to authenticated;

-- Insert auth users
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'comms-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from comms_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'comms-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from comms_probe_ids;

-- Insert companies and branches
insert into public.companies (id, name, slug)
select company_a, 'Communications Company A', 'comms-company-a' from comms_probe_ids
union all
select company_b, 'Communications Company B', 'comms-company-b' from comms_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'Comms Branch A', 'CBA', 'Dubai', 'AED' from comms_probe_ids
union all
select branch_b, company_b, 'Comms Branch B', 'CBB', 'Doha', 'QAR' from comms_probe_ids;

-- Insert company and branch memberships
insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from comms_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from comms_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from comms_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from comms_probe_ids;

-- Insert roles and assign permissions
insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Comms Admin A', 'comms_admin_a', 'Admin role A', true from comms_probe_ids
union all
select role_b, company_b, 'Comms Admin B', 'comms_admin_b', 'Admin role B', true from comms_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from comms_probe_ids ids
join public.permissions p on p.permission_key in ('manage_communications', 'view_leads', 'create_lead')
union all
select ids.company_b, ids.role_b, p.id
from comms_probe_ids ids
join public.permissions p on p.permission_key in ('manage_communications', 'view_leads', 'create_lead');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from comms_probe_ids
union all
select company_b, user_b, role_b from comms_probe_ids;

-- Insert leads for testing
insert into public.leads (id, company_id, branch_id, name, phone, whatsapp, email, status, lead_score)
select lead_a, company_a, branch_a, 'Lead A', '+971500000000', '+971500000000', 'lead-a@example.test', 'new'::public.lead_status, 50 from comms_probe_ids
union all
select lead_b, company_b, branch_b, 'Lead B', '+974500000000', '+974500000000', 'lead-b@example.test', 'new'::public.lead_status, 50 from comms_probe_ids;

-- Insert a provider specifically for Company B to verify tenant isolation
insert into public.communication_providers (company_id, branch_id, provider_type, provider_name, config)
select company_b, branch_b, 'email'::public.provider_type, 'Company B Mailer', '{"apiKey": "secret-b"}'::jsonb from comms_probe_ids;

-- Authenticate as User A
select set_config('request.jwt.claim.sub', (select user_a::text from comms_probe_ids), true);
set local role authenticated;

-- 3. Test RLS restricts selecting other tenant's providers
select is(
  (select count(*)::integer from public.communication_providers where provider_name = 'Company B Mailer'),
  0::integer,
  'user_a cannot read company_b providers'
);

-- 4. Test User A can insert a template
insert into public.message_templates (company_id, name, channel, body, variables)
select company_a, 'Custom Temp A', 'whatsapp'::public.lead_message_channel, 'Welcome {{name}}', array['name'] from comms_probe_ids;

select is(
  (select body from public.message_templates where name = 'Custom Temp A'),
  'Welcome {{name}}',
  'user_a can insert custom message template'
);

-- 5. Test database block on queued messages without consent
select throws_ok(
  format(
    $$insert into public.outbound_messages (company_id, branch_id, lead_id, channel, recipient_address, body, status)
      values ('%s', '%s', '%s', 'whatsapp'::public.lead_message_channel, '+971500000000', 'Hello', 'queued'::public.outbound_message_status)$$,
    (select company_a from comms_probe_ids),
    (select branch_a from comms_probe_ids),
    (select lead_a from comms_probe_ids)
  ),
  'P0001',
  'Communication consent not granted for channel whatsapp',
  'database blocks queued message without customer consent'
);

-- 6. Test database allows transactional override message even without consent
insert into public.outbound_messages (company_id, branch_id, lead_id, channel, recipient_address, subject, body, status)
select company_a, branch_a, lead_a, 'whatsapp'::public.lead_message_channel, '+971500000000', '[TRANSACTIONAL] Invoice Paid', 'Your invoice is paid', 'queued'::public.outbound_message_status
from comms_probe_ids;

select is(
  (select status::text from public.outbound_messages where subject = '[TRANSACTIONAL] Invoice Paid'),
  'queued',
  'database allows transactional override subject without consent'
);

-- 7. Test granting consent and sending queued message succeeds
insert into public.customer_consents (company_id, lead_id, channel, is_granted, consent_source, updated_by)
select company_a, lead_a, 'whatsapp'::public.lead_message_channel, true, 'test-script', user_a
from comms_probe_ids;

insert into public.outbound_messages (company_id, branch_id, lead_id, channel, recipient_address, subject, body, status)
select company_a, branch_a, lead_a, 'whatsapp'::public.lead_message_channel, '+971500000000', 'Standard message', 'Hello back', 'queued'::public.outbound_message_status
from comms_probe_ids;

select is(
  (select status::text from public.outbound_messages where subject = 'Standard message'),
  'queued',
  'database allows queued message after consent is granted'
);

-- Finish pgTAP tests
reset role;

select * from finish();

rollback;
