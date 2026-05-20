begin;

select plan(8);

-- 1. Verify RLS is enabled on all new tables
select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'ai_automation_agents',
        'ai_document_extractions',
        'ai_automation_proposals'
      )
      and rowsecurity is false
  ),
  'all phase 20 tables have RLS enabled'
);

-- Setup temp table with probe IDs
create temp table ai_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b;

grant select on ai_probe_ids to authenticated;

-- Insert auth users
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select user_a, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ai-a@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from ai_probe_ids
union all
select user_b, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ai-b@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb from ai_probe_ids;

-- Insert companies and branches
insert into public.companies (id, name, slug)
select company_a, 'AI Automation Company A', 'ai-company-a' from ai_probe_ids
union all
select company_b, 'AI Automation Company B', 'ai-company-b' from ai_probe_ids;

insert into public.branches (id, company_id, name, code, city, currency_code)
select branch_a, company_a, 'AI Branch A', 'ABA', 'Dubai', 'AED' from ai_probe_ids
union all
select branch_b, company_b, 'AI Branch B', 'ABB', 'Doha', 'QAR' from ai_probe_ids;

-- Insert company and branch memberships
insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from ai_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from ai_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from ai_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from ai_probe_ids;

-- Insert roles and assign permissions (including view_audit_logs to verify audit logs)
insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'AI Admin A', 'ai_admin_a', 'Admin role A', true from ai_probe_ids
union all
select role_b, company_b, 'AI Admin B', 'ai_admin_b', 'Admin role B', true from ai_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from ai_probe_ids ids
join public.permissions p on p.permission_key in ('view_ai_automation', 'manage_ai_automation', 'view_audit_logs')
union all
select ids.company_b, ids.role_b, p.id
from ai_probe_ids ids
join public.permissions p on p.permission_key in ('view_ai_automation', 'manage_ai_automation', 'view_audit_logs');

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from ai_probe_ids
union all
select company_b, user_b, role_b from ai_probe_ids;

-- Seed default agents for Company B to verify tenant isolation
insert into public.ai_automation_agents (company_id, branch_id, agent_type, is_enabled, status, config)
select company_b, branch_b, 'parts_reorder'::public.ai_agent_type, true, 'idle'::public.ai_agent_status, '{"threshold": 10}'::jsonb from ai_probe_ids
on conflict (company_id, agent_type, branch_id) do update set is_enabled = true;

-- Authenticate as User A
select set_config('request.jwt.claim.sub', (select user_a::text from ai_probe_ids), true);
set local role authenticated;

-- 2. Verify User A cannot see User B's seeded agent due to RLS
select is(
  (select count(*)::integer from public.ai_automation_agents where company_id = (select company_b from ai_probe_ids)),
  0::integer,
  'User A cannot read Company B agents due to RLS isolation'
);

-- 3. Verify User A can create and read their own agent
insert into public.ai_automation_agents (company_id, branch_id, agent_type, is_enabled, status, config)
select company_a, branch_a, 'parts_reorder'::public.ai_agent_type, true, 'idle'::public.ai_agent_status, '{"threshold": 5}'::jsonb from ai_probe_ids
on conflict (company_id, agent_type, branch_id) do update set is_enabled = true;

select is(
  (select config->>'threshold' from public.ai_automation_agents where company_id = (select company_a from ai_probe_ids) and agent_type = 'parts_reorder'),
  '5',
  'User A can read/write their own agent configuration'
);

-- 4. Test RLS on document extractions
insert into public.ai_document_extractions (company_id, branch_id, file_path, file_name, file_type, document_type, status, extracted_data)
select company_a, branch_a, 'uploads/invoice1.pdf', 'invoice1.pdf', 'application/pdf', 'supplier_invoice', 'pending'::public.ai_extraction_status, '{"vin": "XYZ123"}'::jsonb
from ai_probe_ids;

select is(
  (select count(*)::integer from public.ai_document_extractions where company_id = (select company_a from ai_probe_ids)),
  1::integer,
  'User A can insert and read their own document extractions'
);

-- 5. Test audit log generation when toggling an agent
-- Let's update agent state and see if it automatically triggers insert into audit_logs
update public.ai_automation_agents
set is_enabled = false, updated_by = (select user_a from ai_probe_ids)
where company_id = (select company_a from ai_probe_ids) and agent_type = 'parts_reorder';

select is(
  (select count(*)::integer from public.audit_logs where company_id = (select company_a from ai_probe_ids) and entity_type = 'ai_automation_agent' and action = 'agent_disabled'),
  1::integer,
  'database trigger automatically writes audit log entry on agent status toggle'
);

-- 6. Test RLS on proposals
insert into public.ai_automation_proposals (company_id, branch_id, agent_id, proposal_type, title, description, justification, proposed_payload, status)
select
  company_a,
  branch_a,
  (select id from public.ai_automation_agents where company_id = company_a and agent_type = 'parts_reorder'),
  'parts_reorder'::public.ai_proposal_type,
  'Restock Brake Pads',
  'Reorder 20 heavy-duty brake pads',
  'Stock has dropped below threshold 5',
  '{"part_number": "BP-202X", "qty": 20}'::jsonb,
  'pending'::public.ai_proposal_status
from ai_probe_ids;

select is(
  (select count(*)::integer from public.ai_automation_proposals where company_id = (select company_a from ai_probe_ids)),
  1::integer,
  'User A can insert and view pending automation proposals'
);

-- 7. Test audit log generation on proposal resolution
update public.ai_automation_proposals
set status = 'approved'::public.ai_proposal_status, resolved_by = (select user_a from ai_probe_ids), resolved_at = now()
where company_id = (select company_a from ai_probe_ids) and title = 'Restock Brake Pads';

select is(
  (select count(*)::integer from public.audit_logs where company_id = (select company_a from ai_probe_ids) and entity_type = 'ai_automation_proposal' and action = 'proposal_approved'),
  1::integer,
  'database trigger automatically writes audit log entry on proposal resolution'
);

-- 8. Verify User A cannot insert into User B's agents
select throws_ok(
  format(
    $$insert into public.ai_automation_agents (company_id, agent_type, config)
      values ('%s', 'parts_reorder'::public.ai_agent_type, '{"leak": true}'::jsonb)$$,
    (select company_b from ai_probe_ids)
  ),
  null,
  null,
  'RLS prevents cross-company inserts'
);

-- Finish pgTAP tests
reset role;

select * from finish();

rollback;
