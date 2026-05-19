begin;

select plan(6);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'ai_conversations',
        'ai_messages',
        'ai_requests',
        'ai_actions',
        'ai_approvals',
        'ai_extracted_documents',
        'ai_report_requests'
      )
      and rowsecurity is false
  ),
  'all phase 9 AI tables have RLS enabled'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'use_ai_assistant'),
  'AI assistant permission exists'
);

select ok(
  exists(select 1 from public.ai_conversations where title = 'AI assistant onboarding'),
  'seed AI onboarding conversation exists'
);

create temp table ai_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as conversation_a,
       gen_random_uuid() as conversation_b,
       gen_random_uuid() as request_a,
       gen_random_uuid() as request_b,
       gen_random_uuid() as action_a;

grant select on ai_probe_ids to authenticated;

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
       'ai-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from ai_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'ai-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from ai_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'AI Company A', 'ai-company-a' from ai_probe_ids
union all
select company_b, 'AI Company B', 'ai-company-b' from ai_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'AI Branch A', 'AIA', 'Dubai' from ai_probe_ids
union all
select branch_b, company_b, 'AI Branch B', 'AIB', 'Doha' from ai_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from ai_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from ai_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from ai_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from ai_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'AI Manager A', 'ai_manager_a', 'AI manager test role.', true from ai_probe_ids
union all
select role_b, company_b, 'AI Manager B', 'ai_manager_b', 'AI manager test role.', true from ai_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from ai_probe_ids ids
join public.permissions p on p.permission_key in ('use_ai_assistant', 'view_vehicles', 'view_leads', 'view_payments', 'view_reports', 'manage_company_settings')
union all
select ids.company_b, ids.role_b, p.id
from ai_probe_ids ids
join public.permissions p on p.permission_key in ('use_ai_assistant', 'view_vehicles', 'view_leads', 'view_payments', 'view_reports', 'manage_company_settings');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from ai_probe_ids
union all
select company_b, user_b, role_b from ai_probe_ids;

insert into public.ai_conversations (id, company_id, branch_id, title, created_by)
select conversation_a, company_a, branch_a, 'Company A AI thread', user_a from ai_probe_ids
union all
select conversation_b, company_b, branch_b, 'Company B AI thread', user_b from ai_probe_ids;

insert into public.ai_requests (
  id,
  company_id,
  branch_id,
  conversation_id,
  request_number,
  prompt,
  response,
  provider,
  model,
  status,
  created_by
)
select request_a, company_a, branch_a, conversation_a, 'AI-A-001', 'How many vehicles?', 'One vehicle.', 'local', 'deterministic', 'completed'::public.ai_request_status, user_a
from ai_probe_ids
union all
select request_b, company_b, branch_b, conversation_b, 'AI-B-001', 'How many vehicles?', 'Two vehicles.', 'local', 'deterministic', 'completed'::public.ai_request_status, user_b
from ai_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from ai_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(request_number order by request_number) from public.ai_requests where request_number like 'AI-_-%'),
  array['AI-A-001']::text[],
  'AI RLS only exposes current company requests'
);

insert into public.ai_actions (
  id,
  company_id,
  branch_id,
  conversation_id,
  request_id,
  action_number,
  tool_name,
  status,
  sensitive,
  requires_approval,
  created_by
)
select action_a, company_a, branch_a, conversation_a, request_a, 'ACT-A-001', 'createQuotationDraft', 'approval_required'::public.ai_action_status, true, true, user_a
from ai_probe_ids;

insert into public.ai_approvals (
  company_id,
  branch_id,
  action_id,
  request_id,
  approval_number,
  title,
  requested_by,
  payload
)
select company_a, branch_a, action_a, request_a, 'APR-A-001', 'Approve quotation draft', user_a, '{"tool":"createQuotationDraft"}'::jsonb
from ai_probe_ids;

select is(
  (select status::text from public.ai_approvals where approval_number = 'APR-A-001'),
  'pending',
  'AI user can create pending approval records'
);

insert into public.ai_report_requests (
  company_id,
  branch_id,
  report_number,
  report_type,
  prompt,
  status,
  created_by
)
select company_a, branch_a, 'AIR-A-001', 'inventory', 'Generate inventory report.', 'draft'::public.ai_report_status, user_a
from ai_probe_ids;

select is(
  (select count(*)::integer from public.ai_report_requests where report_number = 'AIR-A-001'),
  1,
  'AI user can create report request records'
);

reset role;

select * from finish();

rollback;
