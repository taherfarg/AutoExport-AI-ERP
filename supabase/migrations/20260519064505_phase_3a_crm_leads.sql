create type public.customer_type as enum ('individual', 'dealer', 'company', 'export_buyer');
create type public.lead_status as enum ('new', 'contacted', 'interested', 'quotation_sent', 'reserved', 'negotiation', 'won', 'lost');
create type public.lead_source_type as enum ('instagram', 'facebook', 'tiktok', 'website', 'whatsapp', 'linkedin', 'referral', 'showroom_visit', 'export_inquiry');
create type public.follow_up_status as enum ('open', 'completed', 'cancelled', 'overdue');
create type public.follow_up_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.lead_message_direction as enum ('inbound', 'outbound', 'internal');
create type public.lead_message_channel as enum ('phone', 'whatsapp', 'email', 'instagram', 'facebook', 'website', 'showroom', 'internal');

insert into public.permissions (module_key, action_key, permission_key, description) values
('crm', 'view_customers', 'view_customers', 'View customer records.'),
('crm', 'create_customer', 'create_customer', 'Create customer records.'),
('crm', 'update_customer', 'update_customer', 'Update customer records.'),
('crm', 'view_leads', 'view_leads', 'View assigned and permitted leads.'),
('crm', 'view_all_leads', 'view_all_leads', 'View all company leads.'),
('crm', 'create_lead', 'create_lead', 'Create leads.'),
('crm', 'update_lead', 'update_lead', 'Update leads.'),
('crm', 'assign_lead', 'assign_lead', 'Assign leads to salespeople.'),
('crm', 'create_follow_up', 'create_follow_up', 'Create lead follow-ups.'),
('crm', 'update_follow_up', 'update_follow_up', 'Update lead follow-ups.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin')
  and p.permission_key in (
    'view_customers',
    'create_customer',
    'update_customer',
    'view_leads',
    'view_all_leads',
    'create_lead',
    'update_lead',
    'assign_lead',
    'create_follow_up',
    'update_follow_up'
  )
on conflict (role_id, permission_id) do nothing;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  customer_type public.customer_type not null default 'individual',
  name text not null,
  phone text,
  whatsapp text,
  email text,
  country_code char(2),
  city text,
  preferred_language text not null default 'en',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  customer_id uuid,
  name text not null,
  customer_type public.customer_type not null default 'individual',
  phone text,
  whatsapp text,
  email text,
  country_code char(2),
  city text,
  preferred_brand text,
  preferred_model text,
  budget numeric(14,2),
  currency_code char(3) not null default 'AED',
  language text not null default 'en',
  lead_source public.lead_source_type not null default 'website',
  assigned_salesperson_id uuid references public.profiles(id),
  status public.lead_status not null default 'new',
  lead_score integer not null default 0,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  converted_customer_id uuid,
  converted_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (converted_customer_id, company_id) references public.customers(id, company_id) on delete set null (converted_customer_id),
  constraint leads_budget_check check (budget is null or budget >= 0),
  constraint leads_score_check check (lead_score between 0 and 100)
);

create table public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  lead_id uuid not null,
  customer_id uuid,
  direction public.lead_message_direction not null default 'internal',
  channel public.lead_message_channel not null default 'internal',
  subject text,
  body text not null,
  message_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete cascade,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id)
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  lead_id uuid not null,
  customer_id uuid,
  assigned_to uuid references public.profiles(id),
  title text not null,
  notes text,
  due_at timestamptz not null,
  completed_at timestamptz,
  status public.follow_up_status not null default 'open',
  priority public.follow_up_priority not null default 'normal',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete cascade,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  lead_id uuid not null,
  customer_id uuid,
  vehicle_id uuid,
  title text not null,
  stage public.lead_status not null default 'new',
  estimated_value numeric(14,2) not null default 0,
  probability integer not null default 10,
  expected_close_date date,
  owner_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete cascade,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  constraint opportunities_value_check check (estimated_value >= 0),
  constraint opportunities_probability_check check (probability between 0 and 100)
);

create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  customer_id uuid not null,
  lead_id uuid,
  note text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete cascade,
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete set null (lead_id)
);

create or replace function app_private.can_view_lead(
  target_company_id uuid,
  target_branch_id uuid,
  target_assigned_salesperson_id uuid,
  target_created_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select app_private.has_company_permission(target_company_id, 'view_leads')
    and app_private.can_access_branch(target_company_id, target_branch_id)
    and (
      app_private.has_company_permission(target_company_id, 'view_all_leads')
      or app_private.has_company_permission(target_company_id, 'manage_users')
      or app_private.has_company_permission(target_company_id, 'manage_company_settings')
      or target_assigned_salesperson_id = app_private.current_profile_id()
      or target_created_by = app_private.current_profile_id()
    )
$$;

revoke execute on function app_private.can_view_lead(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function app_private.can_view_lead(uuid, uuid, uuid, uuid) to authenticated;

create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger follow_ups_set_updated_at before update on public.follow_ups for each row execute function public.set_updated_at();
create trigger opportunities_set_updated_at before update on public.opportunities for each row execute function public.set_updated_at();

create index customers_company_branch_idx on public.customers(company_id, branch_id) where deleted_at is null;
create index customers_company_name_idx on public.customers(company_id, name) where deleted_at is null;
create unique index customers_company_email_unique on public.customers(company_id, lower(email)) where email is not null and deleted_at is null;
create index leads_company_branch_status_idx on public.leads(company_id, branch_id, status) where deleted_at is null;
create index leads_company_assignee_idx on public.leads(company_id, assigned_salesperson_id) where deleted_at is null;
create index leads_company_source_idx on public.leads(company_id, lead_source) where deleted_at is null;
create index leads_company_followup_idx on public.leads(company_id, next_follow_up_at) where deleted_at is null;
create index lead_messages_company_lead_idx on public.lead_messages(company_id, lead_id, message_at desc) where deleted_at is null;
create index follow_ups_company_due_idx on public.follow_ups(company_id, due_at, status) where deleted_at is null;
create index follow_ups_company_assignee_idx on public.follow_ups(company_id, assigned_to, status) where deleted_at is null;
create index opportunities_company_stage_idx on public.opportunities(company_id, stage) where deleted_at is null;
create index customer_notes_company_customer_idx on public.customer_notes(company_id, customer_id, created_at desc) where deleted_at is null;

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.lead_messages to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;
grant select, insert, update, delete on public.opportunities to authenticated;
grant select, insert, update, delete on public.customer_notes to authenticated;

alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.lead_messages enable row level security;
alter table public.follow_ups enable row level security;
alter table public.opportunities enable row level security;
alter table public.customer_notes enable row level security;

create policy "customers_select_crm_viewers" on public.customers
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_customers')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "customers_insert_crm_creators" on public.customers
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'create_customer')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "customers_update_crm_editors" on public.customers
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'update_customer')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'update_customer')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "customers_delete_crm_editors" on public.customers
  for delete to authenticated
  using (
    app_private.has_company_permission(company_id, 'update_customer')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "leads_select_crm_viewers" on public.leads
  for select to authenticated
  using (
    deleted_at is null
    and app_private.can_view_lead(company_id, branch_id, assigned_salesperson_id, created_by)
  );

create policy "leads_insert_crm_creators" on public.leads
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'create_lead')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "leads_update_crm_editors" on public.leads
  for update to authenticated
  using (
    deleted_at is null
    and app_private.can_view_lead(company_id, branch_id, assigned_salesperson_id, created_by)
    and app_private.has_company_permission(company_id, 'update_lead')
  )
  with check (
    app_private.has_company_permission(company_id, 'update_lead')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "leads_delete_crm_editors" on public.leads
  for delete to authenticated
  using (
    app_private.has_company_permission(company_id, 'update_lead')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "lead_messages_select_visible_leads" on public.lead_messages
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.leads l
      where l.id = lead_messages.lead_id
        and l.company_id = lead_messages.company_id
        and app_private.can_view_lead(l.company_id, l.branch_id, l.assigned_salesperson_id, l.created_by)
        and l.deleted_at is null
    )
  );

create policy "lead_messages_insert_visible_leads" on public.lead_messages
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'update_lead')
    and exists (
      select 1 from public.leads l
      where l.id = lead_messages.lead_id
        and l.company_id = lead_messages.company_id
        and app_private.can_view_lead(l.company_id, l.branch_id, l.assigned_salesperson_id, l.created_by)
        and l.deleted_at is null
    )
  );

create policy "follow_ups_select_visible_leads" on public.follow_ups
  for select to authenticated
  using (
    deleted_at is null
    and (
      assigned_to = app_private.current_profile_id()
      or exists (
        select 1 from public.leads l
        where l.id = follow_ups.lead_id
          and l.company_id = follow_ups.company_id
          and app_private.can_view_lead(l.company_id, l.branch_id, l.assigned_salesperson_id, l.created_by)
          and l.deleted_at is null
      )
    )
  );

create policy "follow_ups_insert_crm_creators" on public.follow_ups
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'create_follow_up')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "follow_ups_update_crm_editors" on public.follow_ups
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'update_follow_up')
    and (
      assigned_to = app_private.current_profile_id()
      or exists (
        select 1 from public.leads l
        where l.id = follow_ups.lead_id
          and l.company_id = follow_ups.company_id
          and app_private.can_view_lead(l.company_id, l.branch_id, l.assigned_salesperson_id, l.created_by)
          and l.deleted_at is null
      )
    )
  )
  with check (
    app_private.has_company_permission(company_id, 'update_follow_up')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "opportunities_select_visible_leads" on public.opportunities
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.leads l
      where l.id = opportunities.lead_id
        and l.company_id = opportunities.company_id
        and app_private.can_view_lead(l.company_id, l.branch_id, l.assigned_salesperson_id, l.created_by)
        and l.deleted_at is null
    )
  );

create policy "opportunities_mutate_lead_editors" on public.opportunities
  for all to authenticated
  using (
    app_private.has_company_permission(company_id, 'update_lead')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'update_lead')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "customer_notes_select_customer_viewers" on public.customer_notes
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_customers')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "customer_notes_insert_customer_editors" on public.customer_notes
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'update_customer')
    and app_private.can_access_branch(company_id, branch_id)
  );

insert into public.customers (company_id, branch_id, customer_type, name, phone, whatsapp, email, country_code, city, preferred_language, notes) values
('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'export_buyer', 'Algeria Auto Dealer', '+213555010001', '+213555010001', 'purchasing@algeria-auto.example', 'DZ', 'Algiers', 'en', 'Dealer buyer focused on Toyota and Lexus export stock.'),
('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'company', 'Dubai Towers Contracting', '+971501110001', '+971501110001', 'fleet@dubaitowers.example', 'AE', 'Dubai', 'en', 'Fleet buyer for pickups and SUVs.'),
('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'dealer', 'Sahara Motors DZ', '+213555010002', '+213555010002', 'imports@saharamotors.example', 'DZ', 'Oran', 'fr', 'Regular export customer for GCC-market SUVs.'),
('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'company', 'Gulf Fleet Buyers', '+97444110001', '+97444110001', 'fleet@gulfbuyers.example', 'QA', 'Doha', 'en', 'Fleet buyer comparing pickup options.'),
('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'individual', 'Private Export Customer', '+213555010003', '+213555010003', 'private.export@example.com', 'DZ', 'Algiers', 'en', 'Private buyer interested in Prado and Patrol stock.');

insert into public.leads (
  company_id,
  branch_id,
  customer_id,
  name,
  customer_type,
  phone,
  whatsapp,
  email,
  country_code,
  city,
  preferred_brand,
  preferred_model,
  budget,
  currency_code,
  language,
  lead_source,
  status,
  lead_score,
  last_contact_at,
  next_follow_up_at,
  notes
)
select c.company_id, c.branch_id, c.id, c.name, c.customer_type, c.phone, c.whatsapp, c.email, c.country_code, c.city, 'Toyota', 'Land Cruiser Prado', 320000, 'AED', c.preferred_language, 'whatsapp'::public.lead_source_type, 'interested'::public.lead_status, 86, now() - interval '1 day', now() + interval '3 hours', 'Needs export-ready Prado with complete documents.'
from public.customers c where c.email = 'purchasing@algeria-auto.example'
union all
select c.company_id, c.branch_id, c.id, c.name, c.customer_type, c.phone, c.whatsapp, c.email, c.country_code, c.city, 'Toyota', 'Hilux', 190000, 'AED', c.preferred_language, 'showroom_visit'::public.lead_source_type, 'contacted'::public.lead_status, 72, now() - interval '2 days', now() + interval '1 day', 'Looking for three Hilux units for site supervisors.'
from public.customers c where c.email = 'fleet@dubaitowers.example'
union all
select c.company_id, c.branch_id, c.id, c.name, c.customer_type, c.phone, c.whatsapp, c.email, c.country_code, c.city, 'Nissan', 'Patrol', 390000, 'AED', c.preferred_language, 'export_inquiry'::public.lead_source_type, 'new'::public.lead_status, 68, null, now() + interval '2 days', 'Asked for Patrol and shipping estimate to Algeria.'
from public.customers c where c.email = 'imports@saharamotors.example'
union all
select c.company_id, c.branch_id, c.id, c.name, c.customer_type, c.phone, c.whatsapp, c.email, c.country_code, c.city, 'Ford', 'Ranger Raptor', 280000, 'AED', c.preferred_language, 'linkedin'::public.lead_source_type, 'quotation_sent'::public.lead_status, 80, now() - interval '12 hours', now() + interval '6 hours', 'Quotation needed for Ranger Raptor fleet order.'
from public.customers c where c.email = 'fleet@gulfbuyers.example'
union all
select c.company_id, c.branch_id, c.id, c.name, c.customer_type, c.phone, c.whatsapp, c.email, c.country_code, c.city, 'Toyota', 'Prado', 12000000, 'DZD', c.preferred_language, 'facebook'::public.lead_source_type, 'negotiation'::public.lead_status, 74, now() - interval '5 hours', now() - interval '2 hours', 'Comparing local Prado and imported Patrol options.'
from public.customers c where c.email = 'private.export@example.com';

insert into public.follow_ups (company_id, branch_id, lead_id, customer_id, title, notes, due_at, status, priority)
select company_id, branch_id, id, customer_id, 'Send available stock shortlist', 'Include export readiness and document status.', next_follow_up_at, 'open'::public.follow_up_status, 'high'::public.follow_up_priority
from public.leads
where next_follow_up_at is not null;

insert into public.lead_messages (company_id, branch_id, lead_id, customer_id, direction, channel, subject, body, message_at)
select company_id, branch_id, id, customer_id, 'inbound'::public.lead_message_direction, 'whatsapp'::public.lead_message_channel, 'Vehicle inquiry', coalesce(notes, 'Lead created from inquiry.'), coalesce(last_contact_at, now())
from public.leads;

insert into public.opportunities (company_id, branch_id, lead_id, customer_id, title, stage, estimated_value, probability, expected_close_date)
select company_id, branch_id, id, customer_id, preferred_brand || ' ' || coalesce(preferred_model, 'vehicle') || ' opportunity', status, coalesce(budget, 0), greatest(10, least(90, lead_score)), current_date + 14
from public.leads;
