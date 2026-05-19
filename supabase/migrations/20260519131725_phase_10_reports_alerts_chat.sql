create type public.report_type as enum ('inventory', 'sales', 'profit', 'export', 'marketing', 'branch', 'custom');
create type public.report_export_format as enum ('csv', 'pdf', 'excel', 'email');
create type public.report_export_status as enum ('queued', 'processing', 'completed', 'failed');
create type public.report_schedule_frequency as enum ('daily', 'weekly', 'monthly');
create type public.alert_type as enum (
  'vehicle_reserved_but_deposit_not_paid',
  'customer_payment_overdue',
  'export_documents_missing',
  'shipment_delayed',
  'customs_clearance_pending',
  'vehicle_margin_too_low',
  'vehicle_stock_aging_over_60_days',
  'supplier_payment_due',
  'car_preparation_delayed',
  'new_lead_not_contacted',
  'contract_waiting_signature',
  'insurance_expiring',
  'registration_renewal_due',
  'marketing_campaign_underperforming',
  'branch_sales_target_not_reached',
  'manual'
);
create type public.alert_priority as enum ('low', 'medium', 'high', 'critical');
create type public.alert_status as enum ('open', 'assigned', 'snoozed', 'resolved', 'dismissed');
create type public.task_status as enum ('open', 'in_progress', 'blocked', 'completed', 'cancelled');
create type public.reminder_status as enum ('pending', 'sent', 'snoozed', 'completed', 'cancelled');
create type public.chat_thread_type as enum ('sales_team', 'export_team', 'branch', 'vehicle', 'customer', 'internal_support', 'ai_assistant');
create type public.chat_message_type as enum ('text', 'system', 'task_created');

insert into public.modules (module_key, name, description, sort_order, is_core) values
('alerts', 'Smart Alerts', 'Operational alerts, tasks, reminders, and notification follow-up.', 112, false),
('chat', 'Chat Center', 'Team, branch, vehicle, customer, export, support, and AI conversations.', 114, false)
on conflict (module_key) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key in ('alerts', 'chat')
where p.package_key in ('showroom_pro', 'export_business', 'enterprise_dealer_group')
on conflict (package_id, module_id) do update set enabled = excluded.enabled;

insert into public.permissions (module_key, action_key, permission_key, description) values
('alerts', 'view', 'view_alerts', 'View smart alerts, tasks, and reminders.'),
('alerts', 'manage', 'manage_alerts', 'Assign, snooze, and resolve smart alerts and tasks.'),
('chat', 'use', 'use_chat', 'Use internal chat center.'),
('reports', 'manage', 'manage_reports', 'Manage saved reports, exports, and schedules.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin')
  and p.permission_key in ('view_reports', 'manage_reports', 'view_alerts', 'manage_alerts', 'use_chat', 'view_audit_logs')
on conflict (role_id, permission_id) do nothing;

create table public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  report_number text not null,
  name text not null,
  report_type public.report_type not null default 'custom',
  description text,
  filters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  is_shared boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, report_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  saved_report_id uuid,
  export_number text not null,
  report_type public.report_type not null default 'custom',
  export_format public.report_export_format not null default 'csv',
  status public.report_export_status not null default 'queued',
  filters jsonb not null default '{}'::jsonb,
  result_summary text,
  file_path text,
  requested_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, export_number),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (saved_report_id, company_id) references public.saved_reports(id, company_id) on delete set null (saved_report_id)
);

create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  saved_report_id uuid,
  schedule_number text not null,
  name text not null,
  frequency public.report_schedule_frequency not null default 'weekly',
  day_of_week integer,
  day_of_month integer,
  run_time time not null default '09:00',
  timezone text not null default 'Asia/Dubai',
  recipients text[] not null default '{}',
  active boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, schedule_number),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (saved_report_id, company_id) references public.saved_reports(id, company_id) on delete cascade
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  alert_number text not null,
  alert_type public.alert_type not null default 'manual',
  title text not null,
  description text,
  priority public.alert_priority not null default 'medium',
  status public.alert_status not null default 'open',
  related_entity_type text,
  related_entity_id uuid,
  due_at timestamptz,
  snoozed_until timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, alert_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  alert_id uuid,
  task_number text not null,
  title text not null,
  description text,
  status public.task_status not null default 'open',
  priority public.alert_priority not null default 'medium',
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, task_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (alert_id, company_id) references public.alerts(id, company_id) on delete set null (alert_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  task_id uuid not null,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (task_id, company_id) references public.tasks(id, company_id) on delete cascade
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  reminder_number text not null,
  title text not null,
  description text,
  status public.reminder_status not null default 'pending',
  remind_at timestamptz not null,
  related_entity_type text,
  related_entity_id uuid,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, reminder_number),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  thread_number text not null,
  thread_type public.chat_thread_type not null default 'internal_support',
  title text not null,
  related_entity_type text,
  related_entity_id uuid,
  last_message_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, thread_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  thread_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  deleted_at timestamptz,
  unique (thread_id, profile_id),
  foreign key (thread_id, company_id) references public.chat_threads(id, company_id) on delete cascade
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  thread_id uuid not null,
  message_number text not null,
  message_type public.chat_message_type not null default 'text',
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, message_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (thread_id, company_id) references public.chat_threads(id, company_id) on delete cascade
);

create table public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  message_id uuid not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  storage_bucket text,
  storage_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (message_id, company_id) references public.chat_messages(id, company_id) on delete cascade
);

create trigger saved_reports_set_updated_at before update on public.saved_reports for each row execute function public.set_updated_at();
create trigger report_exports_set_updated_at before update on public.report_exports for each row execute function public.set_updated_at();
create trigger report_schedules_set_updated_at before update on public.report_schedules for each row execute function public.set_updated_at();
create trigger alerts_set_updated_at before update on public.alerts for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger reminders_set_updated_at before update on public.reminders for each row execute function public.set_updated_at();
create trigger chat_threads_set_updated_at before update on public.chat_threads for each row execute function public.set_updated_at();

create or replace function public.set_chat_thread_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_threads
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.thread_id
    and company_id = new.company_id;
  return new;
end;
$$;

create trigger chat_messages_set_thread_last_message
  after insert on public.chat_messages
  for each row execute function public.set_chat_thread_last_message_at();

create index saved_reports_company_type_idx on public.saved_reports(company_id, report_type) where deleted_at is null;
create index report_exports_company_created_idx on public.report_exports(company_id, created_at desc) where deleted_at is null;
create index report_schedules_company_active_idx on public.report_schedules(company_id, active) where deleted_at is null;
create index alerts_company_status_priority_idx on public.alerts(company_id, status, priority) where deleted_at is null;
create index alerts_assigned_to_idx on public.alerts(assigned_to) where deleted_at is null;
create index tasks_company_status_idx on public.tasks(company_id, status) where deleted_at is null;
create index tasks_assigned_to_idx on public.tasks(assigned_to) where deleted_at is null;
create index reminders_company_status_idx on public.reminders(company_id, status, remind_at) where deleted_at is null;
create index chat_threads_company_last_message_idx on public.chat_threads(company_id, last_message_at desc nulls last) where deleted_at is null;
create index chat_participants_profile_idx on public.chat_participants(profile_id, thread_id) where deleted_at is null;
create index chat_messages_thread_created_idx on public.chat_messages(thread_id, created_at desc) where deleted_at is null;

grant select, insert, update, delete on
  public.saved_reports,
  public.report_exports,
  public.report_schedules,
  public.alerts,
  public.tasks,
  public.task_comments,
  public.reminders,
  public.chat_threads,
  public.chat_participants,
  public.chat_messages,
  public.chat_attachments
to authenticated;

alter table public.saved_reports enable row level security;
alter table public.report_exports enable row level security;
alter table public.report_schedules enable row level security;
alter table public.alerts enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.reminders enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_attachments enable row level security;

create policy "saved_reports_select_reports" on public.saved_reports
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_reports')
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
  );

create policy "saved_reports_manage_reports" on public.saved_reports
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_reports'))
  with check (app_private.has_company_permission(company_id, 'manage_reports'));

create policy "report_exports_select_reports" on public.report_exports
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_reports')
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
  );

create policy "report_exports_manage_reports" on public.report_exports
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_reports'))
  with check (app_private.has_company_permission(company_id, 'manage_reports'));

create policy "report_schedules_select_reports" on public.report_schedules
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_reports')
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
  );

create policy "report_schedules_manage_reports" on public.report_schedules
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_reports'))
  with check (app_private.has_company_permission(company_id, 'manage_reports'));

create policy "alerts_select_visible" on public.alerts
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
    and (
      app_private.has_company_permission(company_id, 'view_alerts')
      or assigned_to = app_private.current_profile_id()
      or created_by = app_private.current_profile_id()
    )
  );

create policy "alerts_manage" on public.alerts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_alerts'))
  with check (app_private.has_company_permission(company_id, 'manage_alerts'));

create policy "tasks_select_visible" on public.tasks
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
    and (
      app_private.has_company_permission(company_id, 'view_alerts')
      or assigned_to = app_private.current_profile_id()
      or created_by = app_private.current_profile_id()
    )
  );

create policy "tasks_manage" on public.tasks
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_alerts'))
  with check (app_private.has_company_permission(company_id, 'manage_alerts'));

create policy "task_comments_select_visible" on public.task_comments
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and deleted_at is null
    and exists (
      select 1
      from public.tasks t
      where t.id = task_comments.task_id
        and t.company_id = task_comments.company_id
        and t.deleted_at is null
    )
  );

create policy "task_comments_manage" on public.task_comments
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_alerts'))
  with check (app_private.has_company_permission(company_id, 'manage_alerts'));

create policy "reminders_select_visible" on public.reminders
  for select to authenticated
  using (
    app_private.is_company_member(company_id)
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
    and (
      app_private.has_company_permission(company_id, 'view_alerts')
      or assigned_to = app_private.current_profile_id()
      or created_by = app_private.current_profile_id()
    )
  );

create policy "reminders_manage" on public.reminders
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_alerts'))
  with check (app_private.has_company_permission(company_id, 'manage_alerts'));

create policy "chat_threads_select_participant" on public.chat_threads
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'use_chat')
    and app_private.can_access_branch(company_id, branch_id)
    and deleted_at is null
    and exists (
      select 1
      from public.chat_participants cp
      where cp.company_id = chat_threads.company_id
        and cp.thread_id = chat_threads.id
        and cp.profile_id = app_private.current_profile_id()
        and cp.deleted_at is null
    )
  );

create policy "chat_threads_manage_chat" on public.chat_threads
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_chat'))
  with check (app_private.has_company_permission(company_id, 'use_chat'));

create policy "chat_participants_select_self" on public.chat_participants
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'use_chat')
    and profile_id = app_private.current_profile_id()
    and deleted_at is null
  );

create policy "chat_participants_manage_chat" on public.chat_participants
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_chat'))
  with check (app_private.has_company_permission(company_id, 'use_chat'));

create policy "chat_messages_select_participant" on public.chat_messages
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'use_chat')
    and deleted_at is null
    and exists (
      select 1
      from public.chat_participants cp
      where cp.company_id = chat_messages.company_id
        and cp.thread_id = chat_messages.thread_id
        and cp.profile_id = app_private.current_profile_id()
        and cp.deleted_at is null
    )
  );

create policy "chat_messages_manage_chat" on public.chat_messages
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_chat'))
  with check (app_private.has_company_permission(company_id, 'use_chat'));

create policy "chat_attachments_select_participant" on public.chat_attachments
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'use_chat')
    and deleted_at is null
    and exists (
      select 1
      from public.chat_messages cm
      join public.chat_participants cp
        on cp.company_id = cm.company_id
       and cp.thread_id = cm.thread_id
      where cm.id = chat_attachments.message_id
        and cm.company_id = chat_attachments.company_id
        and cp.profile_id = app_private.current_profile_id()
        and cp.deleted_at is null
        and cm.deleted_at is null
    )
  );

create policy "chat_attachments_manage_chat" on public.chat_attachments
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'use_chat'))
  with check (app_private.has_company_permission(company_id, 'use_chat'));

with company_context as (
  select c.id as company_id,
         b.id as branch_id,
         cm.profile_id
  from public.companies c
  left join lateral (
    select id
    from public.branches
    where branches.company_id = c.id
      and branches.deleted_at is null
    order by is_head_office desc, created_at asc
    limit 1
  ) b on true
  left join lateral (
    select profile_id
    from public.company_memberships
    where company_memberships.company_id = c.id
      and company_memberships.status = 'active'
    order by created_at asc
    limit 1
  ) cm on true
  where c.deleted_at is null
)
insert into public.saved_reports (company_id, branch_id, report_number, name, report_type, description, filters, columns, created_by, updated_by)
select company_id,
       branch_id,
       'RPT-SEED-' || upper(substr(md5(company_id::text || '-inventory'), 1, 8)),
       'Inventory Snapshot',
       'inventory'::public.report_type,
       'Default inventory report for stock, status, and branch analysis.',
       jsonb_build_object('status', 'all'),
       jsonb_build_array('stock_number', 'brand', 'model', 'status', 'branch', 'selling_price'),
       profile_id,
       profile_id
from company_context
on conflict (company_id, report_number) do nothing;

with company_context as (
  select c.id as company_id,
         b.id as branch_id,
         cm.profile_id
  from public.companies c
  left join lateral (
    select id
    from public.branches
    where branches.company_id = c.id
      and branches.deleted_at is null
    order by is_head_office desc, created_at asc
    limit 1
  ) b on true
  left join lateral (
    select profile_id
    from public.company_memberships
    where company_memberships.company_id = c.id
      and company_memberships.status = 'active'
    order by created_at asc
    limit 1
  ) cm on true
  where c.deleted_at is null
),
seed_alerts as (
  insert into public.alerts (company_id, branch_id, alert_number, alert_type, title, description, priority, status, assigned_to, due_at, created_by, updated_by)
  select company_id,
         branch_id,
         'ALT-SEED-' || upper(substr(md5(company_id::text || '-docs'), 1, 8)),
         'export_documents_missing'::public.alert_type,
         'Export documents need review',
         'Review missing export documents and assign a document controller.',
         'high'::public.alert_priority,
         'open'::public.alert_status,
         profile_id,
         now() + interval '1 day',
         profile_id,
         profile_id
  from company_context
  on conflict (company_id, alert_number) do nothing
  returning id, company_id, branch_id, alert_number, assigned_to, created_by
),
seed_tasks as (
  insert into public.tasks (company_id, branch_id, alert_id, task_number, title, description, priority, assigned_to, due_at, created_by, updated_by)
  select company_id,
         branch_id,
         id,
         'TSK-SEED-' || upper(substr(md5(company_id::text || '-docs'), 1, 8)),
         'Review export document checklist',
         'Confirm required export document status and update the alert.',
         'high'::public.alert_priority,
         assigned_to,
         now() + interval '1 day',
         created_by,
         created_by
  from seed_alerts
  on conflict (company_id, task_number) do nothing
  returning id, company_id, branch_id, assigned_to, created_by
)
insert into public.reminders (company_id, branch_id, reminder_number, title, description, remind_at, assigned_to, created_by, updated_by)
select company_id,
       branch_id,
       'REM-SEED-' || upper(substr(md5(company_id::text || '-docs'), 1, 8)),
       'Follow up on export document alert',
       'Reminder generated from the default smart alert seed.',
       now() + interval '8 hours',
       assigned_to,
       created_by,
       created_by
from seed_tasks
on conflict (company_id, reminder_number) do nothing;

with company_context as (
  select c.id as company_id,
         b.id as branch_id,
         cm.profile_id
  from public.companies c
  left join lateral (
    select id
    from public.branches
    where branches.company_id = c.id
      and branches.deleted_at is null
    order by is_head_office desc, created_at asc
    limit 1
  ) b on true
  left join lateral (
    select profile_id
    from public.company_memberships
    where company_memberships.company_id = c.id
      and company_memberships.status = 'active'
    order by created_at asc
    limit 1
  ) cm on true
  where c.deleted_at is null
),
seed_threads as (
  insert into public.chat_threads (company_id, branch_id, thread_number, thread_type, title, created_by, updated_by)
  select company_id,
         branch_id,
         'CHT-SEED-' || upper(substr(md5(company_id::text || '-ops'), 1, 8)),
         'internal_support'::public.chat_thread_type,
         'Operations support',
         profile_id,
         profile_id
  from company_context
  on conflict (company_id, thread_number) do nothing
  returning id, company_id, branch_id, created_by
),
seed_participants as (
  insert into public.chat_participants (company_id, thread_id, profile_id)
  select company_id, id, created_by
  from seed_threads
  where created_by is not null
  on conflict (thread_id, profile_id) do nothing
  returning company_id, thread_id, profile_id
)
insert into public.chat_messages (company_id, branch_id, thread_id, message_number, message_type, body, created_by)
select st.company_id,
       st.branch_id,
       st.id,
       'MSG-SEED-' || upper(substr(md5(st.company_id::text || '-ops'), 1, 8)),
       'system'::public.chat_message_type,
       'Operations chat is ready for team coordination.',
       st.created_by
from seed_threads st
on conflict (company_id, message_number) do nothing;
