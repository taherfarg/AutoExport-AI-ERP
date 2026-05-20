-- Create types
alter type public.lead_message_channel add value if not exists 'sms';

create type public.provider_type as enum ('whatsapp', 'email', 'sms');
create type public.outbound_message_status as enum ('draft', 'pending_approval', 'queued', 'sent', 'delivered', 'read', 'failed');

-- Add permission
insert into public.permissions (module_key, action_key, permission_key, description) values
('crm', 'manage_communications', 'manage_communications', 'Manage communication channels, providers, and templates.')
on conflict (permission_key) do nothing;

-- Assign permissions to owner and super admin roles
insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin')
  and p.permission_key in ('manage_communications')
on conflict (role_id, permission_id) do nothing;

-- Create tables
create table public.communication_providers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  provider_type public.provider_type not null,
  provider_name text not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, provider_type, branch_id),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  channel public.lead_message_channel not null,
  subject text,
  body text not null,
  variables text[] not null default '{}'::text[],
  language text not null default 'en',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id)
);

create table public.customer_consents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid,
  lead_id uuid,
  channel public.lead_message_channel not null,
  is_granted boolean not null default false,
  consent_source text not null default 'verbal',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete cascade,
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete cascade,
  constraint customer_consents_ref_check check (
    (customer_id is not null and lead_id is null) or
    (customer_id is null and lead_id is not null) or
    (customer_id is not null and lead_id is not null)
  )
);


create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  provider_id uuid,
  lead_id uuid,
  customer_id uuid,
  channel public.lead_message_channel not null,
  sender_id uuid references public.profiles(id),
  recipient_address text not null,
  subject text,
  body text not null,
  template_id uuid,
  template_variables jsonb not null default '{}'::jsonb,
  status public.outbound_message_status not null default 'draft',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  error_message text,
  external_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (provider_id, company_id) references public.communication_providers(id, company_id) on delete set null (provider_id),
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete set null (lead_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (template_id, company_id) references public.message_templates(id, company_id) on delete set null (template_id)
);

create table public.message_delivery_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  outbound_message_id uuid not null,
  status public.outbound_message_status not null,
  event_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_description text,
  unique (id, company_id),
  foreign key (outbound_message_id, company_id) references public.outbound_messages(id, company_id) on delete cascade
);

-- Triggers for updated_at
create trigger communication_providers_set_updated_at before update on public.communication_providers for each row execute function public.set_updated_at();
create trigger message_templates_set_updated_at before update on public.message_templates for each row execute function public.set_updated_at();
create trigger outbound_messages_set_updated_at before update on public.outbound_messages for each row execute function public.set_updated_at();

-- Enforce consent check at database level
create or replace function app_private.enforce_outbound_message_consent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  consent_exists boolean;
begin
  -- By-pass draft or pending_approval states, only check queued/sent
  if new.status not in ('queued', 'sent') then
    return new;
  end if;

  -- Check if opt-in consent is granted
  if new.lead_id is not null then
    select is_granted into consent_exists
    from public.customer_consents
    where company_id = new.company_id
      and lead_id = new.lead_id
      and channel = new.channel;
  elsif new.customer_id is not null then
    select is_granted into consent_exists
    from public.customer_consents
    where company_id = new.company_id
      and customer_id = new.customer_id
      and channel = new.channel;
  else
    consent_exists := false;
  end if;

  -- If not granted, raise exception (unless subject starts with [TRANSACTIONAL])
  if coalesce(consent_exists, false) = false and coalesce(new.subject, '') not like '[TRANSACTIONAL]%' then
    raise exception 'Communication consent not granted for channel %', new.channel;
  end if;

  return new;
end;
$$;

create trigger outbound_messages_consent_check
  before insert or update on public.outbound_messages
  for each row execute function app_private.enforce_outbound_message_consent();

-- Indexes
create index communication_providers_company_type_idx on public.communication_providers(company_id, provider_type) where deleted_at is null;
create index message_templates_company_channel_idx on public.message_templates(company_id, channel) where deleted_at is null;
create index customer_consents_company_ref_idx on public.customer_consents(company_id, customer_id, lead_id);
create unique index customer_consents_customer_unique_idx on public.customer_consents (company_id, customer_id, channel) where customer_id is not null;
create unique index customer_consents_lead_unique_idx on public.customer_consents (company_id, lead_id, channel) where lead_id is not null;
create index outbound_messages_company_status_idx on public.outbound_messages(company_id, status);
create index message_delivery_events_company_msg_idx on public.message_delivery_events(company_id, outbound_message_id);

-- Grants
grant select, insert, update, delete on public.communication_providers to authenticated;
grant select, insert, update, delete on public.message_templates to authenticated;
grant select, insert, update, delete on public.customer_consents to authenticated;
grant select, insert, update, delete on public.outbound_messages to authenticated;
grant select, insert, update, delete on public.message_delivery_events to authenticated;

-- Enable RLS
alter table public.communication_providers enable row level security;
alter table public.message_templates enable row level security;
alter table public.customer_consents enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.message_delivery_events enable row level security;

-- RLS Policies
create policy "communication_providers_select" on public.communication_providers
  for select to authenticated
  using (deleted_at is null and app_private.is_company_member(company_id));

create policy "communication_providers_all" on public.communication_providers
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_communications'))
  with check (app_private.has_company_permission(company_id, 'manage_communications'));

create policy "message_templates_select" on public.message_templates
  for select to authenticated
  using (deleted_at is null and app_private.is_company_member(company_id));

create policy "message_templates_all" on public.message_templates
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_communications'))
  with check (app_private.has_company_permission(company_id, 'manage_communications'));

create policy "customer_consents_select" on public.customer_consents
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "customer_consents_all" on public.customer_consents
  for all to authenticated
  using (app_private.is_company_member(company_id))
  with check (app_private.is_company_member(company_id));

create policy "outbound_messages_select" on public.outbound_messages
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "outbound_messages_all" on public.outbound_messages
  for all to authenticated
  using (app_private.is_company_member(company_id))
  with check (app_private.is_company_member(company_id));

create policy "message_delivery_events_select" on public.message_delivery_events
  for select to authenticated
  using (app_private.is_company_member(company_id));

create policy "message_delivery_events_all" on public.message_delivery_events
  for all to authenticated
  using (app_private.is_company_member(company_id))
  with check (app_private.is_company_member(company_id));

-- Seed data
insert into public.communication_providers (company_id, provider_type, provider_name, config, is_active)
select c.id,
       seed.provider_type::public.provider_type,
       seed.provider_name,
       seed.config,
       true
from public.companies c
cross join (values
  ('whatsapp', 'Meta WhatsApp API', '{"phoneNumberId": "default-sandbox-id", "accessToken": "default-sandbox-token"}'::jsonb),
  ('email', 'SendGrid API', '{"apiKey": "SG.default-sandbox-key"}'::jsonb),
  ('sms', 'Twilio SMS', '{"accountSid": "ACdefault", "authToken": "default-token", "fromNumber": "+1234567890"}'::jsonb)
) as seed(provider_type, provider_name, config)
on conflict (company_id, provider_type, branch_id) do nothing;

insert into public.message_templates (company_id, name, channel, subject, body, variables, language)
select c.id,
       seed.name,
       seed.channel::public.lead_message_channel,
       seed.subject,
       seed.body,
       seed.variables,
       'en'
from public.companies c
cross join (values
  ('Lead Welcome WhatsApp', 'whatsapp', null, 'Hello {{customer_name}}, thank you for contacting AutoSphere. We received your interest in the {{vehicle_model}}.', array['customer_name', 'vehicle_model']),
  ('Quotation Email', 'email', 'Your AutoSphere Quotation', 'Dear {{customer_name}},\n\nPlease find attached the quotation for the {{vehicle_model}}.\n\nTotal Price: {{price}}\n\nBest regards,\n{{salesperson_name}}', array['customer_name', 'vehicle_model', 'price', 'salesperson_name'])
) as seed(name, channel, subject, body, variables)
on conflict do nothing;
