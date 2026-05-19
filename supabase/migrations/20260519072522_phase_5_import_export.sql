create type public.destination_region as enum ('gcc', 'mena', 'africa', 'europe', 'asia', 'americas');
create type public.logistics_partner_type as enum ('shipping_company', 'freight_forwarder', 'customs_broker', 'inland_transport', 'insurance_provider', 'inspection_provider');
create type public.shipping_method as enum ('ro_ro', 'container', 'land_transport', 'air_freight');
create type public.export_order_status as enum ('draft', 'active', 'delayed', 'completed', 'cancelled');
create type public.import_order_status as enum ('draft', 'ordered', 'in_transit', 'arrived', 'under_clearance', 'received', 'cancelled');
create type public.shipping_status as enum (
  'waiting_booking',
  'booked',
  'vehicle_delivered_to_port',
  'loaded',
  'shipped',
  'arrived',
  'under_clearance',
  'delivered_to_customer'
);
create type public.customs_status as enum ('not_started', 'pending_documents', 'submitted', 'inspection', 'duties_pending', 'under_clearance', 'cleared', 'delayed', 'rejected');
create type public.export_document_status as enum ('missing', 'pending', 'uploaded', 'verified', 'expired');
create type public.shipment_cost_type as enum ('ocean_freight', 'land_transport', 'port_fee', 'customs_duty', 'inspection', 'insurance', 'handling', 'storage', 'other');

insert into public.permissions (module_key, action_key, permission_key, description) values
('export', 'view', 'view_exports', 'View import/export operations.'),
('export', 'update_status', 'update_export_status', 'Update shipping and customs statuses.'),
('export', 'manage_partners', 'manage_logistics_partners', 'Manage logistics partners.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin')
  and p.permission_key in (
    'view_exports',
    'manage_exports',
    'update_export_status',
    'manage_logistics_partners'
  )
on conflict (role_id, permission_id) do nothing;

create table public.destination_countries (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null unique,
  country_name text not null,
  region public.destination_region not null default 'mena',
  common_ports text[] not null default '{}',
  currency_code char(3),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.logistics_partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  partner_type public.logistics_partner_type not null,
  name text not null,
  country_code char(2),
  city text,
  contact_name text,
  phone text,
  email text,
  website text,
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, name, partner_type),
  unique (id, company_id)
);

create table public.export_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  export_order_number text not null,
  customer_id uuid,
  vehicle_id uuid not null,
  sales_invoice_id uuid,
  proforma_invoice_id uuid,
  destination_country_code char(2) not null,
  destination_port text not null,
  shipping_method public.shipping_method not null default 'container',
  shipping_company_id uuid,
  logistics_partner_id uuid,
  booking_number text,
  container_number text,
  bl_number text,
  estimated_departure_date date,
  estimated_arrival_date date,
  actual_departure_date date,
  actual_arrival_date date,
  shipping_status public.shipping_status not null default 'waiting_booking',
  customs_status public.customs_status not null default 'not_started',
  payment_status public.payment_status not null default 'unpaid',
  document_status public.export_document_status not null default 'missing',
  status public.export_order_status not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, export_order_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete restrict,
  foreign key (sales_invoice_id, company_id) references public.sales_invoices(id, company_id) on delete set null (sales_invoice_id),
  foreign key (proforma_invoice_id, company_id) references public.proforma_invoices(id, company_id) on delete set null (proforma_invoice_id),
  foreign key (shipping_company_id, company_id) references public.logistics_partners(id, company_id) on delete set null (shipping_company_id),
  foreign key (logistics_partner_id, company_id) references public.logistics_partners(id, company_id) on delete set null (logistics_partner_id)
);

create table public.import_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  import_order_number text not null,
  supplier_name text not null,
  origin_country_code char(2) not null,
  origin_port text,
  destination_country_code char(2) not null default 'AE',
  destination_port text,
  shipping_method public.shipping_method not null default 'container',
  logistics_partner_id uuid,
  vehicle_count integer not null default 1,
  estimated_departure_date date,
  estimated_arrival_date date,
  shipping_status public.shipping_status not null default 'waiting_booking',
  customs_status public.customs_status not null default 'not_started',
  status public.import_order_status not null default 'draft',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, import_order_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (logistics_partner_id, company_id) references public.logistics_partners(id, company_id) on delete set null (logistics_partner_id),
  constraint import_orders_vehicle_count_check check (vehicle_count > 0)
);

create table public.shipping_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  export_order_id uuid,
  import_order_id uuid,
  event_status public.shipping_status not null,
  event_date timestamptz not null default now(),
  location text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (export_order_id, company_id) references public.export_orders(id, company_id) on delete cascade,
  foreign key (import_order_id, company_id) references public.import_orders(id, company_id) on delete cascade,
  constraint shipping_events_one_order_check check (
    (export_order_id is not null and import_order_id is null)
    or (export_order_id is null and import_order_id is not null)
  )
);

create table public.customs_clearance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  export_order_id uuid,
  import_order_id uuid,
  broker_id uuid,
  customs_status public.customs_status not null default 'not_started',
  declaration_number text,
  inspection_date date,
  cleared_date date,
  duties_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (export_order_id, company_id) references public.export_orders(id, company_id) on delete cascade,
  foreign key (import_order_id, company_id) references public.import_orders(id, company_id) on delete cascade,
  foreign key (broker_id, company_id) references public.logistics_partners(id, company_id) on delete set null (broker_id),
  constraint customs_one_order_check check (
    (export_order_id is not null and import_order_id is null)
    or (export_order_id is null and import_order_id is not null)
  ),
  constraint customs_duties_check check (duties_amount >= 0)
);

create table public.export_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  export_order_id uuid not null,
  document_type text not null,
  title text not null,
  status public.export_document_status not null default 'missing',
  is_required boolean not null default true,
  storage_bucket text,
  storage_path text,
  expires_at date,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, export_order_id, document_type),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (export_order_id, company_id) references public.export_orders(id, company_id) on delete cascade
);

create table public.shipment_costs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  export_order_id uuid,
  import_order_id uuid,
  cost_type public.shipment_cost_type not null default 'other',
  description text not null,
  amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  cost_date date not null default current_date,
  supplier_name text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (export_order_id, company_id) references public.export_orders(id, company_id) on delete cascade,
  foreign key (import_order_id, company_id) references public.import_orders(id, company_id) on delete cascade,
  constraint shipment_costs_one_order_check check (
    (export_order_id is not null and import_order_id is null)
    or (export_order_id is null and import_order_id is not null)
  ),
  constraint shipment_costs_amount_check check (amount >= 0)
);

create or replace function public.refresh_export_document_status(target_export_order_id uuid, target_company_id uuid)
returns void
language plpgsql
as $$
declare
  missing_count integer;
  pending_count integer;
begin
  select
    count(*) filter (where is_required and status in ('missing', 'expired')),
    count(*) filter (where is_required and status in ('pending', 'uploaded'))
  into missing_count, pending_count
  from public.export_documents
  where export_order_id = target_export_order_id
    and company_id = target_company_id
    and deleted_at is null;

  update public.export_orders
  set document_status = case
    when coalesce(missing_count, 0) > 0 then 'missing'::public.export_document_status
    when coalesce(pending_count, 0) > 0 then 'pending'::public.export_document_status
    else 'verified'::public.export_document_status
  end
  where id = target_export_order_id
    and company_id = target_company_id;
end;
$$;

create or replace function public.after_export_document_changed()
returns trigger
language plpgsql
as $$
begin
  if new.export_order_id is not null then
    perform public.refresh_export_document_status(new.export_order_id, new.company_id);
  end if;
  return new;
end;
$$;

create or replace function public.after_shipping_event_created()
returns trigger
language plpgsql
as $$
begin
  if new.export_order_id is not null then
    update public.export_orders
    set shipping_status = new.event_status,
        actual_departure_date = case when new.event_status = 'shipped' then coalesce(actual_departure_date, new.event_date::date) else actual_departure_date end,
        actual_arrival_date = case when new.event_status = 'arrived' then coalesce(actual_arrival_date, new.event_date::date) else actual_arrival_date end,
        updated_by = new.created_by
    where id = new.export_order_id
      and company_id = new.company_id;
  end if;

  if new.import_order_id is not null then
    update public.import_orders
    set shipping_status = new.event_status,
        updated_by = new.created_by
    where id = new.import_order_id
      and company_id = new.company_id;
  end if;

  return new;
end;
$$;

create or replace function public.after_customs_clearance_changed()
returns trigger
language plpgsql
as $$
begin
  if new.export_order_id is not null then
    update public.export_orders
    set customs_status = new.customs_status,
        updated_by = new.updated_by
    where id = new.export_order_id
      and company_id = new.company_id;
  end if;

  if new.import_order_id is not null then
    update public.import_orders
    set customs_status = new.customs_status,
        updated_by = new.updated_by
    where id = new.import_order_id
      and company_id = new.company_id;
  end if;

  return new;
end;
$$;

create trigger logistics_partners_set_updated_at before update on public.logistics_partners for each row execute function public.set_updated_at();
create trigger export_orders_set_updated_at before update on public.export_orders for each row execute function public.set_updated_at();
create trigger import_orders_set_updated_at before update on public.import_orders for each row execute function public.set_updated_at();
create trigger customs_clearance_set_updated_at before update on public.customs_clearance for each row execute function public.set_updated_at();
create trigger export_documents_set_updated_at before update on public.export_documents for each row execute function public.set_updated_at();
create trigger shipment_costs_set_updated_at before update on public.shipment_costs for each row execute function public.set_updated_at();
create trigger export_documents_after_changed after insert or update on public.export_documents for each row execute function public.after_export_document_changed();
create trigger shipping_events_after_created after insert on public.shipping_events for each row execute function public.after_shipping_event_created();
create trigger customs_clearance_after_changed after insert or update on public.customs_clearance for each row execute function public.after_customs_clearance_changed();

create index logistics_partners_company_type_idx on public.logistics_partners(company_id, partner_type) where deleted_at is null;
create index export_orders_company_branch_status_idx on public.export_orders(company_id, branch_id, status) where deleted_at is null;
create index export_orders_company_destination_idx on public.export_orders(company_id, destination_country_code) where deleted_at is null;
create index export_orders_company_shipping_idx on public.export_orders(company_id, shipping_status) where deleted_at is null;
create index import_orders_company_branch_status_idx on public.import_orders(company_id, branch_id, status) where deleted_at is null;
create index shipping_events_company_export_idx on public.shipping_events(company_id, export_order_id, event_date desc);
create index customs_clearance_company_export_idx on public.customs_clearance(company_id, export_order_id) where deleted_at is null;
create index export_documents_company_order_idx on public.export_documents(company_id, export_order_id, status) where deleted_at is null;
create index shipment_costs_company_export_idx on public.shipment_costs(company_id, export_order_id) where deleted_at is null;

grant select on public.destination_countries to authenticated;
grant select, insert, update, delete on public.logistics_partners to authenticated;
grant select, insert, update, delete on public.export_orders to authenticated;
grant select, insert, update, delete on public.import_orders to authenticated;
grant select, insert, update, delete on public.shipping_events to authenticated;
grant select, insert, update, delete on public.customs_clearance to authenticated;
grant select, insert, update, delete on public.export_documents to authenticated;
grant select, insert, update, delete on public.shipment_costs to authenticated;

alter table public.destination_countries enable row level security;
alter table public.logistics_partners enable row level security;
alter table public.export_orders enable row level security;
alter table public.import_orders enable row level security;
alter table public.shipping_events enable row level security;
alter table public.customs_clearance enable row level security;
alter table public.export_documents enable row level security;
alter table public.shipment_costs enable row level security;

create policy "destination_countries_select_authenticated" on public.destination_countries
  for select to authenticated
  using (active = true);

create policy "logistics_partners_select_export_viewers" on public.logistics_partners
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_exports')
  );

create policy "logistics_partners_manage" on public.logistics_partners
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_logistics_partners'))
  with check (app_private.has_company_permission(company_id, 'manage_logistics_partners'));

create policy "export_orders_select_viewers" on public.export_orders
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "export_orders_insert_managers" on public.export_orders
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'manage_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "export_orders_update_managers" on public.export_orders
  for update to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'manage_exports') or app_private.has_company_permission(company_id, 'update_export_status'))
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    (app_private.has_company_permission(company_id, 'manage_exports') or app_private.has_company_permission(company_id, 'update_export_status'))
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "import_orders_select_viewers" on public.import_orders
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "import_orders_manage" on public.import_orders
  for all to authenticated
  using (
    app_private.has_company_permission(company_id, 'manage_exports')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'manage_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "shipping_events_select_viewers" on public.shipping_events
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "shipping_events_insert_status_updaters" on public.shipping_events
  for insert to authenticated
  with check (
    (app_private.has_company_permission(company_id, 'manage_exports') or app_private.has_company_permission(company_id, 'update_export_status'))
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "customs_clearance_select_viewers" on public.customs_clearance
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "customs_clearance_manage" on public.customs_clearance
  for all to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'manage_exports') or app_private.has_company_permission(company_id, 'update_export_status'))
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    (app_private.has_company_permission(company_id, 'manage_exports') or app_private.has_company_permission(company_id, 'update_export_status'))
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "export_documents_select_viewers" on public.export_documents
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "export_documents_manage" on public.export_documents
  for all to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_exports')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'manage_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "shipment_costs_select_viewers" on public.shipment_costs
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "shipment_costs_manage" on public.shipment_costs
  for all to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'manage_exports')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'manage_exports')
    and app_private.can_access_branch(company_id, branch_id)
  );

insert into public.destination_countries (country_code, country_name, region, common_ports, currency_code) values
('DZ', 'Algeria', 'mena', array['Algiers', 'Oran', 'Djen Djen'], 'DZD'),
('EG', 'Egypt', 'mena', array['Alexandria', 'Port Said', 'Sokhna'], 'EGP'),
('LY', 'Libya', 'mena', array['Tripoli', 'Misrata', 'Benghazi'], 'LYD'),
('GH', 'Ghana', 'africa', array['Tema', 'Takoradi'], 'GHS'),
('BE', 'Belgium', 'europe', array['Antwerp', 'Zeebrugge'], 'EUR'),
('QA', 'Qatar', 'gcc', array['Hamad Port', 'Doha'], 'QAR'),
('OM', 'Oman', 'gcc', array['Sohar', 'Salalah', 'Muscat'], 'OMR'),
('SA', 'Saudi Arabia', 'gcc', array['Jeddah', 'Dammam', 'Riyadh Dry Port'], 'SAR')
on conflict (country_code) do nothing;

insert into public.logistics_partners (
  company_id,
  partner_type,
  name,
  country_code,
  city,
  contact_name,
  phone,
  email,
  notes
) values
('10000000-0000-4000-8000-000000000001', 'shipping_company', 'GulfLine Shipping', 'AE', 'Dubai', 'Nadia Rahman', '+971501222001', 'ops@gulflineshipping.example', 'Container and RORO bookings from Jebel Ali.'),
('10000000-0000-4000-8000-000000000001', 'customs_broker', 'Maghreb Customs Services', 'DZ', 'Algiers', 'Karim Haddad', '+213555010201', 'clearance@maghreb-customs.example', 'Algeria customs clearance partner.'),
('10000000-0000-4000-8000-000000000002', 'freight_forwarder', 'Desert Bridge Logistics', 'AE', 'Sharjah', 'Omar Saleh', '+971501222002', 'exports@desertbridge.example', 'GCC and North Africa forwarding.'),
('10000000-0000-4000-8000-000000000004', 'inland_transport', 'Sahara Port Transport', 'DZ', 'Algiers', 'Yacine Belkacem', '+213555010202', 'dispatch@saharaport.example', 'Port delivery and inland transport.')
on conflict (company_id, name, partner_type) do nothing;

insert into public.export_orders (
  company_id,
  branch_id,
  export_order_number,
  customer_id,
  vehicle_id,
  sales_invoice_id,
  proforma_invoice_id,
  destination_country_code,
  destination_port,
  shipping_method,
  shipping_company_id,
  logistics_partner_id,
  booking_number,
  container_number,
  estimated_departure_date,
  estimated_arrival_date,
  shipping_status,
  customs_status,
  payment_status,
  document_status,
  status,
  notes
)
select
  v.company_id,
  v.branch_id,
  'EX-SEED-0001',
  c.id,
  v.id,
  si.id,
  pi.id,
  'DZ',
  'Algiers',
  'container',
  lp_ship.id,
  lp_customs.id,
  'BK-DZ-0001',
  'MSCU1234567',
  current_date + 5,
  current_date + 19,
  'booked',
  'pending_documents',
  coalesce(si.invoice_status::text, 'unpaid')::public.payment_status,
  'pending',
  'active',
  'Seed export order for Algeria shipment.'
from public.vehicles v
left join public.customers c on c.company_id = v.company_id and c.email = 'purchasing@algeria-auto.example'
left join public.sales_invoices si on si.company_id = v.company_id and si.vehicle_id = v.id
left join public.proforma_invoices pi on pi.company_id = v.company_id and pi.vehicle_id = v.id
left join public.logistics_partners lp_ship on lp_ship.company_id = v.company_id and lp_ship.partner_type = 'shipping_company'
left join public.logistics_partners lp_customs on lp_customs.company_id = v.company_id and lp_customs.partner_type = 'customs_broker'
where v.company_id = '10000000-0000-4000-8000-000000000001'
  and v.stock_number = 'PM-DXB-0003'
limit 1
on conflict (company_id, export_order_number) do nothing;

insert into public.export_documents (company_id, branch_id, export_order_id, document_type, title, status, is_required)
select company_id, branch_id, id, 'commercial_invoice', 'Commercial invoice', 'pending'::public.export_document_status, true
from public.export_orders
where export_order_number = 'EX-SEED-0001'
union all
select company_id, branch_id, id, 'bill_of_lading', 'Bill of lading', 'missing'::public.export_document_status, true
from public.export_orders
where export_order_number = 'EX-SEED-0001'
union all
select company_id, branch_id, id, 'certificate_of_origin', 'Certificate of origin', 'missing'::public.export_document_status, true
from public.export_orders
where export_order_number = 'EX-SEED-0001'
on conflict (company_id, export_order_id, document_type) do nothing;

insert into public.shipping_events (company_id, branch_id, export_order_id, event_status, event_date, location, notes)
select company_id, branch_id, id, 'booked'::public.shipping_status, now(), 'Jebel Ali', 'Shipping booking confirmed.'
from public.export_orders
where export_order_number = 'EX-SEED-0001';

insert into public.customs_clearance (company_id, branch_id, export_order_id, broker_id, customs_status, declaration_number, duties_amount, currency_code, notes)
select eo.company_id, eo.branch_id, eo.id, eo.logistics_partner_id, 'pending_documents'::public.customs_status, 'DZ-DECL-0001', 0, 'AED', 'Waiting for BL and certificate of origin.'
from public.export_orders eo
where eo.export_order_number = 'EX-SEED-0001';

insert into public.shipment_costs (company_id, branch_id, export_order_id, cost_type, description, amount, currency_code, supplier_name)
select company_id, branch_id, id, 'ocean_freight'::public.shipment_cost_type, 'Jebel Ali to Algiers container freight', 8500, 'AED', 'GulfLine Shipping'
from public.export_orders
where export_order_number = 'EX-SEED-0001';

insert into public.import_orders (
  company_id,
  branch_id,
  import_order_number,
  supplier_name,
  origin_country_code,
  origin_port,
  destination_country_code,
  destination_port,
  shipping_method,
  logistics_partner_id,
  vehicle_count,
  estimated_departure_date,
  estimated_arrival_date,
  shipping_status,
  customs_status,
  status,
  notes
)
select
  b.company_id,
  b.id,
  'IM-SEED-0001',
  'Belgium Auto Supplier',
  'BE',
  'Antwerp',
  'AE',
  'Jebel Ali',
  'ro_ro'::public.shipping_method,
  lp.id,
  3,
  current_date + 12,
  current_date + 29,
  'booked'::public.shipping_status,
  'not_started'::public.customs_status,
  'ordered'::public.import_order_status,
  'Inbound GCC stock replenishment from Belgium.'
from public.branches b
left join public.logistics_partners lp on lp.company_id = b.company_id and lp.partner_type = 'freight_forwarder'
where b.code in ('DXB-HQ', 'UAE-EXP', 'EMT-DXB', 'SAH-DZ')
on conflict (company_id, import_order_number) do nothing;
