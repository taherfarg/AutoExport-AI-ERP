begin;

select plan(7);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'saved_reports',
        'report_exports',
        'report_schedules',
        'alerts',
        'tasks',
        'task_comments',
        'reminders',
        'chat_threads',
        'chat_participants',
        'chat_messages',
        'chat_attachments'
      )
      and rowsecurity is false
  ),
  'all phase 10 operations tables have RLS enabled'
);

select ok(
  exists(select 1 from public.modules where module_key = 'alerts')
  and exists(select 1 from public.modules where module_key = 'chat')
  and exists(select 1 from public.permissions where permission_key = 'manage_reports')
  and exists(select 1 from public.permissions where permission_key = 'manage_alerts')
  and exists(select 1 from public.permissions where permission_key = 'use_chat'),
  'phase 10 modules and permissions exist'
);

select ok(
  exists(select 1 from public.saved_reports where name = 'Inventory Snapshot')
  and exists(select 1 from public.alerts where title = 'Export documents need review')
  and exists(select 1 from public.chat_messages where body = 'Operations chat is ready for team coordination.'),
  'phase 10 seed reports, alerts, and chat records exist'
);

create temp table operations_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as report_a,
       gen_random_uuid() as report_b,
       gen_random_uuid() as alert_a,
       gen_random_uuid() as alert_b,
       gen_random_uuid() as thread_a,
       gen_random_uuid() as thread_b;

grant select on operations_probe_ids to authenticated;

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
       'operations-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from operations_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'operations-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from operations_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Operations Company A', 'operations-company-a' from operations_probe_ids
union all
select company_b, 'Operations Company B', 'operations-company-b' from operations_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'Operations Branch A', 'OPA', 'Dubai' from operations_probe_ids
union all
select branch_b, company_b, 'Operations Branch B', 'OPB', 'Doha' from operations_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from operations_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from operations_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from operations_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from operations_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Operations Manager A', 'operations_manager_a', 'Operations manager test role.', true from operations_probe_ids
union all
select role_b, company_b, 'Operations Manager B', 'operations_manager_b', 'Operations manager test role.', true from operations_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from operations_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_reports',
  'manage_reports',
  'view_alerts',
  'manage_alerts',
  'use_chat',
  'view_audit_logs',
  'manage_company_settings'
)
union all
select ids.company_b, ids.role_b, p.id
from operations_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_reports',
  'manage_reports',
  'view_alerts',
  'manage_alerts',
  'use_chat',
  'view_audit_logs',
  'manage_company_settings'
);

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from operations_probe_ids
union all
select company_b, user_b, role_b from operations_probe_ids;

insert into public.saved_reports (id, company_id, branch_id, report_number, name, report_type, created_by)
select report_a, company_a, branch_a, 'RPT-OPS-A-001', 'A report', 'inventory'::public.report_type, user_a from operations_probe_ids
union all
select report_b, company_b, branch_b, 'RPT-OPS-B-001', 'B report', 'inventory'::public.report_type, user_b from operations_probe_ids;

insert into public.alerts (id, company_id, branch_id, alert_number, alert_type, title, priority, status, assigned_to, created_by)
select alert_a, company_a, branch_a, 'ALT-OPS-A-001', 'manual'::public.alert_type, 'A alert', 'high'::public.alert_priority, 'open'::public.alert_status, user_a, user_a from operations_probe_ids
union all
select alert_b, company_b, branch_b, 'ALT-OPS-B-001', 'manual'::public.alert_type, 'B alert', 'high'::public.alert_priority, 'open'::public.alert_status, user_b, user_b from operations_probe_ids;

insert into public.chat_threads (id, company_id, branch_id, thread_number, thread_type, title, created_by)
select thread_a, company_a, branch_a, 'CHT-OPS-A-001', 'internal_support'::public.chat_thread_type, 'A thread', user_a from operations_probe_ids
union all
select thread_b, company_b, branch_b, 'CHT-OPS-B-001', 'internal_support'::public.chat_thread_type, 'B thread', user_b from operations_probe_ids;

insert into public.chat_participants (company_id, thread_id, profile_id)
select company_a, thread_a, user_a from operations_probe_ids
union all
select company_b, thread_b, user_b from operations_probe_ids;

insert into public.audit_logs (company_id, branch_id, actor_profile_id, action, entity_type, severity)
select company_a, branch_a, user_a, 'ops_audit_a', 'operations_probe', 'info'::public.audit_severity from operations_probe_ids
union all
select company_b, branch_b, user_b, 'ops_audit_b', 'operations_probe', 'info'::public.audit_severity from operations_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from operations_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(report_number order by report_number) from public.saved_reports where report_number like 'RPT-OPS-%'),
  array['RPT-OPS-A-001']::text[],
  'report RLS only exposes current company reports'
);

update public.alerts
set status = 'resolved'::public.alert_status,
    resolved_at = now()
where alert_number = 'ALT-OPS-A-001';

select is(
  (select status::text from public.alerts where alert_number = 'ALT-OPS-A-001'),
  'resolved',
  'alert manager can resolve own company alert'
);

select is(
  (select array_agg(thread_number order by thread_number) from public.chat_threads where thread_number like 'CHT-OPS-%'),
  array['CHT-OPS-A-001']::text[],
  'chat RLS only exposes participant company thread'
);

insert into public.chat_messages (company_id, branch_id, thread_id, message_number, body, created_by)
select company_a, branch_a, thread_a, 'MSG-OPS-A-001', 'A secure chat message.', user_a
from operations_probe_ids;

select ok(
  exists(
    select 1
    from public.chat_threads
    where thread_number = 'CHT-OPS-A-001'
      and last_message_at is not null
  ),
  'chat message updates thread last message timestamp'
);

reset role;

select * from finish();

rollback;
