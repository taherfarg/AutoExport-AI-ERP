create type public.ai_conversation_status as enum ('open', 'archived');
create type public.ai_message_role as enum ('user', 'assistant', 'tool', 'system');
create type public.ai_request_status as enum ('pending', 'completed', 'failed', 'approval_required');
create type public.ai_action_status as enum ('proposed', 'executed', 'failed', 'blocked', 'approval_required');
create type public.ai_approval_status as enum ('pending', 'approved', 'rejected', 'expired');
create type public.ai_document_extraction_status as enum ('queued', 'processing', 'completed', 'failed');
create type public.ai_report_status as enum ('draft', 'queued', 'completed', 'failed');

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  title text not null,
  status public.ai_conversation_status not null default 'open',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid not null,
  role public.ai_message_role not null,
  content text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (conversation_id, company_id) references public.ai_conversations(id, company_id) on delete cascade
);

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  conversation_id uuid,
  request_number text not null,
  prompt text not null,
  response text,
  answer_payload jsonb not null default '{}'::jsonb,
  provider text not null default 'local',
  model text,
  status public.ai_request_status not null default 'pending',
  error_message text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, request_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (conversation_id, company_id) references public.ai_conversations(id, company_id) on delete set null (conversation_id)
);

create table public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  conversation_id uuid,
  request_id uuid,
  action_number text not null,
  tool_name text not null,
  action_type text not null default 'tool_call',
  status public.ai_action_status not null default 'proposed',
  sensitive boolean not null default false,
  requires_approval boolean not null default false,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, action_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (conversation_id, company_id) references public.ai_conversations(id, company_id) on delete set null (conversation_id),
  foreign key (request_id, company_id) references public.ai_requests(id, company_id) on delete set null (request_id)
);

create table public.ai_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  action_id uuid not null,
  request_id uuid,
  approval_number text not null,
  title text not null,
  status public.ai_approval_status not null default 'pending',
  requested_by uuid references public.profiles(id),
  decided_by uuid references public.profiles(id),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz,
  decision_notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, approval_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (action_id, company_id) references public.ai_actions(id, company_id) on delete cascade,
  foreign key (request_id, company_id) references public.ai_requests(id, company_id) on delete set null (request_id)
);

create table public.ai_extracted_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  document_id uuid,
  extraction_number text not null,
  status public.ai_document_extraction_status not null default 'queued',
  document_type text,
  extracted_data jsonb not null default '{}'::jsonb,
  confidence numeric(5,2),
  error_message text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, extraction_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (document_id, company_id) references public.documents(id, company_id) on delete set null (document_id)
);

create table public.ai_report_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  report_number text not null,
  report_type text not null,
  prompt text not null,
  filters jsonb not null default '{}'::jsonb,
  status public.ai_report_status not null default 'draft',
  result_summary text,
  result_payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, report_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create trigger ai_conversations_set_updated_at before update on public.ai_conversations for each row execute function public.set_updated_at();
create trigger ai_requests_set_updated_at before update on public.ai_requests for each row execute function public.set_updated_at();
create trigger ai_actions_set_updated_at before update on public.ai_actions for each row execute function public.set_updated_at();
create trigger ai_approvals_set_updated_at before update on public.ai_approvals for each row execute function public.set_updated_at();
create trigger ai_extracted_documents_set_updated_at before update on public.ai_extracted_documents for each row execute function public.set_updated_at();
create trigger ai_report_requests_set_updated_at before update on public.ai_report_requests for each row execute function public.set_updated_at();

create index ai_conversations_company_status_idx on public.ai_conversations(company_id, status) where deleted_at is null;
create index ai_messages_company_conversation_idx on public.ai_messages(company_id, conversation_id, created_at);
create index ai_requests_company_status_idx on public.ai_requests(company_id, status) where deleted_at is null;
create index ai_actions_company_status_idx on public.ai_actions(company_id, status) where deleted_at is null;
create index ai_approvals_company_status_idx on public.ai_approvals(company_id, status) where deleted_at is null;
create index ai_extracted_documents_company_status_idx on public.ai_extracted_documents(company_id, status) where deleted_at is null;
create index ai_report_requests_company_status_idx on public.ai_report_requests(company_id, status) where deleted_at is null;

grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.ai_requests to authenticated;
grant select, insert, update, delete on public.ai_actions to authenticated;
grant select, insert, update, delete on public.ai_approvals to authenticated;
grant select, insert, update, delete on public.ai_extracted_documents to authenticated;
grant select, insert, update, delete on public.ai_report_requests to authenticated;

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_actions enable row level security;
alter table public.ai_approvals enable row level security;
alter table public.ai_extracted_documents enable row level security;
alter table public.ai_report_requests enable row level security;

create policy "ai_conversations_select_users" on public.ai_conversations
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'use_ai_assistant')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "ai_conversations_manage_users" on public.ai_conversations
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'))
  with check (app_private.has_company_permission(company_id, 'use_ai_assistant'));

create policy "ai_messages_select_users" on public.ai_messages
  for select to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'));

create policy "ai_messages_manage_users" on public.ai_messages
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'))
  with check (app_private.has_company_permission(company_id, 'use_ai_assistant'));

create policy "ai_requests_select_users" on public.ai_requests
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'use_ai_assistant')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "ai_requests_manage_users" on public.ai_requests
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'))
  with check (app_private.has_company_permission(company_id, 'use_ai_assistant'));

create policy "ai_actions_select_users" on public.ai_actions
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'use_ai_assistant')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "ai_actions_manage_users" on public.ai_actions
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'))
  with check (app_private.has_company_permission(company_id, 'use_ai_assistant'));

create policy "ai_approvals_select_users" on public.ai_approvals
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'use_ai_assistant')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "ai_approvals_manage_users" on public.ai_approvals
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'))
  with check (app_private.has_company_permission(company_id, 'use_ai_assistant'));

create policy "ai_extracted_documents_select_users" on public.ai_extracted_documents
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'use_ai_assistant')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "ai_extracted_documents_manage_users" on public.ai_extracted_documents
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'))
  with check (app_private.has_company_permission(company_id, 'use_ai_assistant'));

create policy "ai_report_requests_select_users" on public.ai_report_requests
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'use_ai_assistant')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "ai_report_requests_manage_users" on public.ai_report_requests
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_ai_assistant'))
  with check (app_private.has_company_permission(company_id, 'use_ai_assistant'));

insert into public.ai_conversations (company_id, title, status)
select c.id, 'AI assistant onboarding', 'open'::public.ai_conversation_status
from public.companies c
on conflict do nothing;

insert into public.ai_requests (company_id, conversation_id, request_number, prompt, response, provider, model, status)
select c.company_id,
       c.id,
       'AI-SEED-' || left(c.company_id::text, 8),
       'What should the AI recommend today?',
       'AI assistant is ready to analyze inventory, sales, export, finance, documents, marketing, and reports based on user permissions.',
       'local',
       'deterministic',
       'completed'::public.ai_request_status
from public.ai_conversations c
where c.title = 'AI assistant onboarding'
on conflict (company_id, request_number) do nothing;
