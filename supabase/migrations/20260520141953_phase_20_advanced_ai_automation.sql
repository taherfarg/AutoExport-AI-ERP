-- Create enums
create type public.ai_agent_type as enum ('crm_follow_up', 'parts_reorder', 'vehicle_marketing');
create type public.ai_agent_status as enum ('idle', 'scanning', 'error');
create type public.ai_extraction_status as enum ('pending', 'completed', 'failed');
create type public.ai_proposal_type as enum ('lead_follow_up', 'parts_reorder', 'vehicle_marketing');
create type public.ai_proposal_status as enum ('pending', 'approved', 'dismissed', 'failed');

-- Add permissions
insert into public.permissions (module_key, action_key, permission_key, description) values
('ai', 'view_automation', 'view_ai_automation', 'View autonomous AI agent configurations and proposals.'),
('ai', 'manage_automation', 'manage_ai_automation', 'Manage and execute autonomous AI agent proposals.')
on conflict (permission_key) do nothing;

-- Assign permissions to system roles
insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager')
  and p.permission_key in ('view_ai_automation', 'manage_ai_automation')
on conflict (role_id, permission_id) do nothing;

-- Create tables
create table public.ai_automation_agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  agent_type public.ai_agent_type not null,
  is_enabled boolean not null default false,
  status public.ai_agent_status not null default 'idle',
  config jsonb not null default '{}'::jsonb,
  last_scan_at timestamptz,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, agent_type, branch_id),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.ai_document_extractions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  document_type text not null,
  status public.ai_extraction_status not null default 'pending',
  extracted_data jsonb not null default '{}'::jsonb,
  raw_text text,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.ai_automation_proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  agent_id uuid,
  proposal_type public.ai_proposal_type not null,
  title text not null,
  description text not null,
  justification text not null,
  proposed_payload jsonb not null default '{}'::jsonb,
  status public.ai_proposal_status not null default 'pending',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (agent_id, company_id) references public.ai_automation_agents(id, company_id) on delete cascade
);

-- Enable updated_at triggers
create trigger ai_automation_agents_set_updated_at before update on public.ai_automation_agents for each row execute function public.set_updated_at();
create trigger ai_document_extractions_set_updated_at before update on public.ai_document_extractions for each row execute function public.set_updated_at();
create trigger ai_automation_proposals_set_updated_at before update on public.ai_automation_proposals for each row execute function public.set_updated_at();

-- Create audit log function for agents
create or replace function app_private.log_ai_agent_audit()
returns trigger as $$
begin
  if TG_OP = 'UPDATE' and OLD.is_enabled <> NEW.is_enabled then
    insert into public.audit_logs (
      company_id,
      branch_id,
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      severity,
      old_values,
      new_values
    ) values (
      NEW.company_id,
      NEW.branch_id,
      NEW.updated_by,
      case when NEW.is_enabled then 'agent_enabled' else 'agent_disabled' end,
      'ai_automation_agent',
      NEW.id,
      'info'::public.audit_severity,
      jsonb_build_object('is_enabled', OLD.is_enabled),
      jsonb_build_object('is_enabled', NEW.is_enabled)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

-- Create audit log function for proposals
create or replace function app_private.log_ai_proposal_audit()
returns trigger as $$
begin
  if TG_OP = 'UPDATE' and OLD.status <> NEW.status then
    insert into public.audit_logs (
      company_id,
      branch_id,
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      severity,
      old_values,
      new_values
    ) values (
      NEW.company_id,
      NEW.branch_id,
      NEW.resolved_by,
      case when NEW.status = 'approved' then 'proposal_approved' else 'proposal_dismissed' end,
      'ai_automation_proposal',
      NEW.id,
      'info'::public.audit_severity,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

-- Create audit log function for document extractions
create or replace function app_private.log_ai_document_extraction_audit()
returns trigger as $$
begin
  if TG_OP = 'UPDATE' and OLD.status <> NEW.status then
    insert into public.audit_logs (
      company_id,
      branch_id,
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      severity,
      old_values,
      new_values
    ) values (
      NEW.company_id,
      NEW.branch_id,
      NEW.updated_by,
      'ocr_document_extraction_' || NEW.status,
      'ai_document_extraction',
      NEW.id,
      case when NEW.status = 'failed' then 'critical'::public.audit_severity else 'info'::public.audit_severity end,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public;

revoke execute on function app_private.log_ai_agent_audit() from public, anon, authenticated;
revoke execute on function app_private.log_ai_proposal_audit() from public, anon, authenticated;
revoke execute on function app_private.log_ai_document_extraction_audit() from public, anon, authenticated;

-- Bind audit triggers
create trigger trg_audit_ai_agents
  after update on public.ai_automation_agents
  for each row execute function app_private.log_ai_agent_audit();

create trigger trg_audit_ai_proposals
  after update on public.ai_automation_proposals
  for each row execute function app_private.log_ai_proposal_audit();

create trigger trg_audit_ai_document_extractions
  after update on public.ai_document_extractions
  for each row execute function app_private.log_ai_document_extraction_audit();

-- Indexes
create index ai_automation_agents_company_type_idx on public.ai_automation_agents(company_id, agent_type);
create index ai_document_extractions_company_status_idx on public.ai_document_extractions(company_id, status);
create index ai_automation_proposals_company_status_idx on public.ai_automation_proposals(company_id, status);

-- Grants
grant select, insert, update, delete on public.ai_automation_agents to authenticated;
grant select, insert, update, delete on public.ai_document_extractions to authenticated;
grant select, insert, update, delete on public.ai_automation_proposals to authenticated;

-- Enable RLS
alter table public.ai_automation_agents enable row level security;
alter table public.ai_document_extractions enable row level security;
alter table public.ai_automation_proposals enable row level security;

-- RLS Policies
create policy "ai_automation_agents_select" on public.ai_automation_agents
  for select to authenticated
  using (app_private.has_company_permission(company_id, 'view_ai_automation'));

create policy "ai_automation_agents_all" on public.ai_automation_agents
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_ai_automation'))
  with check (app_private.has_company_permission(company_id, 'manage_ai_automation'));

create policy "ai_document_extractions_select" on public.ai_document_extractions
  for select to authenticated
  using (app_private.has_company_permission(company_id, 'view_ai_automation'));

create policy "ai_document_extractions_all" on public.ai_document_extractions
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_ai_automation'))
  with check (app_private.has_company_permission(company_id, 'manage_ai_automation'));

create policy "ai_automation_proposals_select" on public.ai_automation_proposals
  for select to authenticated
  using (app_private.has_company_permission(company_id, 'view_ai_automation'));

create policy "ai_automation_proposals_all" on public.ai_automation_proposals
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_ai_automation'))
  with check (app_private.has_company_permission(company_id, 'manage_ai_automation'));

-- Seed default agents for all companies
insert into public.ai_automation_agents (company_id, agent_type, is_enabled, status, config)
select
  c.id,
  agent_type::public.ai_agent_type,
  false,
  'idle'::public.ai_agent_status,
  '{}'::jsonb
from public.companies c
cross join (values
  ('crm_follow_up'),
  ('parts_reorder'),
  ('vehicle_marketing')
) as seed(agent_type)
on conflict (company_id, agent_type, branch_id) do nothing;
