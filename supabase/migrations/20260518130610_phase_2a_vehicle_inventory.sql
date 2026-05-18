create type public.vehicle_status as enum (
  'available',
  'reserved',
  'sold',
  'in_transit',
  'under_customs_clearance',
  'under_preparation',
  'ready_for_export',
  'delivered',
  'cancelled'
);

create type public.vehicle_condition as enum ('new', 'used', 'certified_pre_owned');
create type public.vehicle_listing_status as enum ('not_listed', 'draft', 'listed', 'paused', 'sold');
create type public.vehicle_document_status as enum ('missing', 'partial', 'complete', 'verified');
create type public.vehicle_photo_status as enum ('missing', 'partial', 'complete');

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  stock_number text not null,
  vin text not null,
  brand text not null,
  model text not null,
  year integer not null,
  trim text,
  condition public.vehicle_condition not null default 'new',
  mileage integer not null default 0,
  exterior_color text,
  interior_color text,
  engine text,
  transmission text,
  drivetrain text,
  fuel_type text,
  body_type text,
  seats integer,
  doors integer,
  origin_country_code char(2) not null default 'AE',
  current_country_code char(2) not null default 'AE',
  current_location text,
  purchase_price numeric(14,2) not null default 0,
  shipping_cost numeric(14,2) not null default 0,
  customs_cost numeric(14,2) not null default 0,
  preparation_cost numeric(14,2) not null default 0,
  marketing_cost numeric(14,2) not null default 0,
  other_expenses numeric(14,2) not null default 0,
  total_landed_cost numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  expected_profit numeric(14,2) not null default 0,
  profit_margin numeric(8,2) not null default 0,
  currency_code char(3) not null default 'AED',
  status public.vehicle_status not null default 'available',
  export_available boolean not null default false,
  website_listing_status public.vehicle_listing_status not null default 'not_listed',
  social_media_status public.vehicle_listing_status not null default 'not_listed',
  documents_status public.vehicle_document_status not null default 'missing',
  photos_status public.vehicle_photo_status not null default 'missing',
  acquired_at date not null default current_date,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, stock_number),
  unique (company_id, vin),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  constraint vehicles_year_check check (year between 1900 and 2100),
  constraint vehicles_mileage_check check (mileage >= 0),
  constraint vehicles_price_check check (
    purchase_price >= 0 and shipping_cost >= 0 and customs_cost >= 0
    and preparation_cost >= 0 and marketing_cost >= 0 and other_expenses >= 0
    and selling_price >= 0
  )
);

create table public.vehicle_costs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  purchase_price numeric(14,2) not null default 0,
  shipping_cost numeric(14,2) not null default 0,
  customs_cost numeric(14,2) not null default 0,
  transport_cost numeric(14,2) not null default 0,
  inspection_cost numeric(14,2) not null default 0,
  repair_cost numeric(14,2) not null default 0,
  detailing_cost numeric(14,2) not null default 0,
  marketing_cost numeric(14,2) not null default 0,
  commission_cost numeric(14,2) not null default 0,
  other_expenses numeric(14,2) not null default 0,
  total_landed_cost numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  net_profit numeric(14,2) not null default 0,
  profit_margin numeric(8,2) not null default 0,
  currency_code char(3) not null default 'AED',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, vehicle_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade
);

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  storage_bucket text not null default 'vehicle-media',
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, storage_path),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade
);

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  document_type text not null,
  title text not null,
  storage_bucket text,
  storage_path text,
  status public.vehicle_document_status not null default 'missing',
  expires_at date,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade
);

create table public.vehicle_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  previous_status public.vehicle_status,
  new_status public.vehicle_status not null,
  reason text,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade
);

create table public.vehicle_branch_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  from_branch_id uuid,
  to_branch_id uuid not null,
  reason text,
  moved_by uuid references public.profiles(id),
  moved_at timestamptz not null default now(),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  foreign key (from_branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (to_branch_id, company_id) references public.branches(id, company_id) on delete restrict
);

create table public.vehicle_price_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null,
  old_selling_price numeric(14,2),
  new_selling_price numeric(14,2) not null,
  old_total_landed_cost numeric(14,2),
  new_total_landed_cost numeric(14,2) not null,
  old_expected_profit numeric(14,2),
  new_expected_profit numeric(14,2) not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade
);

create or replace function public.calculate_vehicle_total_landed_cost(
  purchase_price numeric,
  shipping_cost numeric,
  customs_cost numeric,
  preparation_cost numeric,
  marketing_cost numeric,
  other_expenses numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    coalesce(purchase_price, 0)
    + coalesce(shipping_cost, 0)
    + coalesce(customs_cost, 0)
    + coalesce(preparation_cost, 0)
    + coalesce(marketing_cost, 0)
    + coalesce(other_expenses, 0),
    2
  )
$$;

create or replace function public.calculate_vehicle_profit_margin(
  selling_price numeric,
  expected_profit numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(selling_price, 0) <= 0 then 0
    else round((coalesce(expected_profit, 0) / selling_price) * 100, 2)
  end
$$;

create or replace function public.set_vehicle_financials()
returns trigger
language plpgsql
as $$
begin
  new.total_landed_cost := public.calculate_vehicle_total_landed_cost(
    new.purchase_price,
    new.shipping_cost,
    new.customs_cost,
    new.preparation_cost,
    new.marketing_cost,
    new.other_expenses
  );
  new.expected_profit := round(coalesce(new.selling_price, 0) - new.total_landed_cost, 2);
  new.profit_margin := public.calculate_vehicle_profit_margin(new.selling_price, new.expected_profit);
  return new;
end;
$$;

create or replace function public.set_vehicle_cost_financials()
returns trigger
language plpgsql
as $$
begin
  new.total_landed_cost := round(
    coalesce(new.purchase_price, 0)
    + coalesce(new.shipping_cost, 0)
    + coalesce(new.customs_cost, 0)
    + coalesce(new.transport_cost, 0)
    + coalesce(new.inspection_cost, 0)
    + coalesce(new.repair_cost, 0)
    + coalesce(new.detailing_cost, 0)
    + coalesce(new.marketing_cost, 0)
    + coalesce(new.commission_cost, 0)
    + coalesce(new.other_expenses, 0),
    2
  );
  new.gross_profit := round(coalesce(new.selling_price, 0) - new.total_landed_cost, 2);
  new.net_profit := new.gross_profit;
  new.profit_margin := public.calculate_vehicle_profit_margin(new.selling_price, new.net_profit);
  return new;
end;
$$;

create or replace function public.record_vehicle_history()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.vehicle_status_history (
      company_id,
      vehicle_id,
      previous_status,
      new_status,
      reason,
      changed_by
    )
    values (new.company_id, new.id, null, new.status, 'Vehicle created', new.created_by);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.vehicle_status_history (
      company_id,
      vehicle_id,
      previous_status,
      new_status,
      reason,
      changed_by
    )
    values (new.company_id, new.id, old.status, new.status, 'Status updated', new.updated_by);
  end if;

  if new.branch_id is distinct from old.branch_id then
    insert into public.vehicle_branch_movements (
      company_id,
      vehicle_id,
      from_branch_id,
      to_branch_id,
      reason,
      moved_by
    )
    values (new.company_id, new.id, old.branch_id, new.branch_id, 'Branch changed', new.updated_by);
  end if;

  if new.selling_price is distinct from old.selling_price
    or new.total_landed_cost is distinct from old.total_landed_cost then
    insert into public.vehicle_price_history (
      company_id,
      vehicle_id,
      old_selling_price,
      new_selling_price,
      old_total_landed_cost,
      new_total_landed_cost,
      old_expected_profit,
      new_expected_profit,
      changed_by
    )
    values (
      new.company_id,
      new.id,
      old.selling_price,
      new.selling_price,
      old.total_landed_cost,
      new.total_landed_cost,
      old.expected_profit,
      new.expected_profit,
      new.updated_by
    );
  end if;

  return new;
end;
$$;

create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger vehicle_costs_set_updated_at before update on public.vehicle_costs for each row execute function public.set_updated_at();
create trigger vehicle_documents_set_updated_at before update on public.vehicle_documents for each row execute function public.set_updated_at();
create trigger vehicles_set_financials before insert or update on public.vehicles for each row execute function public.set_vehicle_financials();
create trigger vehicle_costs_set_financials before insert or update on public.vehicle_costs for each row execute function public.set_vehicle_cost_financials();
create trigger vehicles_record_history after insert or update on public.vehicles for each row execute function public.record_vehicle_history();

create index vehicles_company_branch_status_idx on public.vehicles(company_id, branch_id, status) where deleted_at is null;
create index vehicles_company_brand_model_idx on public.vehicles(company_id, brand, model) where deleted_at is null;
create index vehicles_company_status_idx on public.vehicles(company_id, status) where deleted_at is null;
create index vehicles_company_export_idx on public.vehicles(company_id, export_available) where deleted_at is null;
create index vehicle_costs_company_vehicle_idx on public.vehicle_costs(company_id, vehicle_id);
create index vehicle_photos_company_vehicle_idx on public.vehicle_photos(company_id, vehicle_id) where deleted_at is null;
create index vehicle_documents_company_vehicle_idx on public.vehicle_documents(company_id, vehicle_id) where deleted_at is null;
create index vehicle_status_history_company_vehicle_idx on public.vehicle_status_history(company_id, vehicle_id, changed_at desc);
create index vehicle_branch_movements_company_vehicle_idx on public.vehicle_branch_movements(company_id, vehicle_id, moved_at desc);
create index vehicle_price_history_company_vehicle_idx on public.vehicle_price_history(company_id, vehicle_id, changed_at desc);

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.vehicle_costs to authenticated;
grant select, insert, update, delete on public.vehicle_photos to authenticated;
grant select, insert, update, delete on public.vehicle_documents to authenticated;
grant select, insert, update, delete on public.vehicle_status_history to authenticated;
grant select, insert, update, delete on public.vehicle_branch_movements to authenticated;
grant select, insert, update, delete on public.vehicle_price_history to authenticated;

alter table public.vehicles enable row level security;
alter table public.vehicle_costs enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.vehicle_status_history enable row level security;
alter table public.vehicle_branch_movements enable row level security;
alter table public.vehicle_price_history enable row level security;

create policy "vehicles_select_permitted_branch" on public.vehicles
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicles_insert_permitted_branch" on public.vehicles
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'create_vehicle')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicles_update_permitted_branch" on public.vehicles
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'update_vehicle')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'update_vehicle')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicles_delete_permitted_branch" on public.vehicles
  for delete to authenticated
  using (
    app_private.has_company_permission(company_id, 'delete_vehicle')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_costs_select_finance" on public.vehicle_costs
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_vehicle_cost')
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_costs.vehicle_id
        and v.company_id = vehicle_costs.company_id
        and app_private.can_access_branch(v.company_id, v.branch_id)
        and v.deleted_at is null
    )
  );

create policy "vehicle_costs_insert_vehicle_managers" on public.vehicle_costs
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'update_vehicle'));

create policy "vehicle_costs_update_vehicle_managers" on public.vehicle_costs
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'update_vehicle'))
  with check (app_private.has_company_permission(company_id, 'update_vehicle'));

create policy "vehicle_costs_delete_vehicle_managers" on public.vehicle_costs
  for delete to authenticated
  using (app_private.has_company_permission(company_id, 'delete_vehicle'));

create policy "vehicle_photos_select_vehicle_viewers" on public.vehicle_photos
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_photos.vehicle_id
        and v.company_id = vehicle_photos.company_id
        and app_private.can_access_branch(v.company_id, v.branch_id)
        and v.deleted_at is null
    )
  );

create policy "vehicle_photos_mutate_document_uploaders" on public.vehicle_photos
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'upload_documents'))
  with check (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "vehicle_documents_select_vehicle_viewers" on public.vehicle_documents
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_vehicles')
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_documents.vehicle_id
        and v.company_id = vehicle_documents.company_id
        and app_private.can_access_branch(v.company_id, v.branch_id)
        and v.deleted_at is null
    )
  );

create policy "vehicle_documents_mutate_document_uploaders" on public.vehicle_documents
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'upload_documents'))
  with check (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "vehicle_status_history_select_vehicle_viewers" on public.vehicle_status_history
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_vehicles')
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_status_history.vehicle_id
        and v.company_id = vehicle_status_history.company_id
        and app_private.can_access_branch(v.company_id, v.branch_id)
        and v.deleted_at is null
    )
  );

create policy "vehicle_status_history_insert_vehicle_managers" on public.vehicle_status_history
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'update_vehicle'));

create policy "vehicle_branch_movements_select_vehicle_viewers" on public.vehicle_branch_movements
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_vehicles')
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_branch_movements.vehicle_id
        and v.company_id = vehicle_branch_movements.company_id
        and app_private.can_access_branch(v.company_id, v.branch_id)
        and v.deleted_at is null
    )
  );

create policy "vehicle_branch_movements_insert_vehicle_managers" on public.vehicle_branch_movements
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'update_vehicle'));

create policy "vehicle_price_history_select_profit_viewers" on public.vehicle_price_history
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_vehicle_profit')
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_price_history.vehicle_id
        and v.company_id = vehicle_price_history.company_id
        and app_private.can_access_branch(v.company_id, v.branch_id)
        and v.deleted_at is null
    )
  );

create policy "vehicle_price_history_insert_vehicle_managers" on public.vehicle_price_history
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'update_vehicle'));

insert into public.companies (
  id,
  name,
  legal_name,
  slug,
  primary_country_code,
  primary_currency_code,
  default_language,
  timezone,
  status
) values
('10000000-0000-4000-8000-000000000001', 'Pollux Motors', 'Pollux Motors FZCO', 'pollux-motors', 'AE', 'AED', 'en', 'Asia/Dubai', 'trial'),
('10000000-0000-4000-8000-000000000002', 'Gulf Auto Export', 'Gulf Auto Export LLC', 'gulf-auto-export', 'AE', 'AED', 'en', 'Asia/Dubai', 'trial'),
('10000000-0000-4000-8000-000000000003', 'Emirates Motors Trading', 'Emirates Motors Trading LLC', 'emirates-motors-trading', 'AE', 'AED', 'en', 'Asia/Dubai', 'trial'),
('10000000-0000-4000-8000-000000000004', 'Sahara Auto Import', 'Sahara Auto Import SARL', 'sahara-auto-import', 'DZ', 'DZD', 'en', 'Africa/Algiers', 'trial');

insert into public.branches (
  id,
  company_id,
  name,
  code,
  country_code,
  city,
  currency_code,
  timezone,
  is_head_office,
  status
) values
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Head Office - Dubai', 'DXB-HQ', 'AE', 'Dubai', 'AED', 'Asia/Dubai', true, 'active'),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Stock Yard - Belgium', 'BE-YARD', 'BE', 'Antwerp', 'EUR', 'Europe/Brussels', false, 'active'),
('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Export Office - UAE', 'UAE-EXP', 'AE', 'Sharjah', 'AED', 'Asia/Dubai', true, 'active'),
('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'Fleet Sales - Abu Dhabi', 'AUH-FLEET', 'AE', 'Abu Dhabi', 'AED', 'Asia/Dubai', true, 'active'),
('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004', 'Sales Office - Algeria', 'ALG-SALES', 'DZ', 'Algiers', 'DZD', 'Africa/Algiers', true, 'active');

insert into public.vehicles (
  company_id,
  branch_id,
  stock_number,
  vin,
  brand,
  model,
  year,
  trim,
  condition,
  mileage,
  exterior_color,
  interior_color,
  engine,
  transmission,
  drivetrain,
  fuel_type,
  body_type,
  seats,
  doors,
  origin_country_code,
  current_country_code,
  current_location,
  purchase_price,
  shipping_cost,
  customs_cost,
  preparation_cost,
  marketing_cost,
  other_expenses,
  selling_price,
  currency_code,
  status,
  export_available,
  website_listing_status,
  social_media_status,
  documents_status,
  photos_status,
  acquired_at
) values
('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'PM-DXB-0001', 'JTGRS2025PM000001', 'Toyota', 'Hilux', 2025, 'GR Sport', 'new', 28, 'Emotional Red', 'Black', '2.8L Turbo Diesel', 'Automatic', '4WD', 'Diesel', 'Pickup', 5, 4, 'TH', 'AE', 'Dubai showroom', 142000, 8500, 18500, 4200, 1200, 900, 195000, 'AED', 'available', true, 'draft', 'draft', 'partial', 'complete', current_date - 12),
('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'PM-DXB-0002', 'JTLCP2026PM000002', 'Toyota', 'Land Cruiser Prado', 2026, 'VX', 'new', 16, 'Pearl White', 'Beige', '2.4L Turbo', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'AE', 'Dubai showroom', 226000, 9200, 27500, 5100, 1800, 1400, 315000, 'AED', 'reserved', true, 'listed', 'draft', 'complete', 'complete', current_date - 22),
('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'PM-DXB-0003', 'JTLC30025PM000003', 'Toyota', 'Land Cruiser 300', 2025, 'VX-R', 'new', 34, 'Black', 'Tan', '3.5L Twin Turbo', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'AE', 'Dubai showroom', 315000, 11000, 38500, 6200, 2100, 1800, 438000, 'AED', 'available', true, 'listed', 'listed', 'complete', 'complete', current_date - 36),
('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'PM-DXB-0004', 'JTLX60025PM000004', 'Lexus', 'LX 600', 2025, 'VIP', 'new', 19, 'Sonic Quartz', 'Crimson', '3.5L Twin Turbo', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'AE', 'Dubai showroom', 445000, 13500, 52000, 7400, 2600, 2100, 612000, 'AED', 'available', true, 'draft', 'not_listed', 'partial', 'partial', current_date - 18),
('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'PM-BE-0005', 'W1NGCLASS24PM0005', 'Mercedes-Benz', 'G-Class', 2024, 'G 63 AMG', 'used', 6400, 'Obsidian Black', 'Black', '4.0L V8 Biturbo', 'Automatic', 'AWD', 'Petrol', 'SUV', 5, 5, 'DE', 'BE', 'Antwerp bonded yard', 612000, 15800, 0, 8500, 3100, 4600, 735000, 'AED', 'in_transit', true, 'not_listed', 'not_listed', 'partial', 'partial', current_date - 41),
('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'GAE-UAE-0001', 'MNTFRR25GAE00001', 'Ford', 'Ranger Raptor', 2025, 'Raptor', 'new', 52, 'Code Orange', 'Black', '3.0L EcoBoost V6', 'Automatic', '4WD', 'Petrol', 'Pickup', 5, 4, 'TH', 'AE', 'Sharjah export yard', 198000, 7800, 24400, 3900, 1500, 800, 275000, 'AED', 'ready_for_export', true, 'listed', 'listed', 'complete', 'complete', current_date - 9),
('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'GAE-UAE-0002', 'LJXJET25GAE00002', 'Jetour', 'T2', 2025, 'Traveler', 'new', 45, 'Matte Green', 'Black', '2.0L Turbo', 'DCT', '4WD', 'Petrol', 'SUV', 5, 5, 'CN', 'AE', 'Sharjah export yard', 82000, 5200, 11200, 2200, 900, 600, 126000, 'AED', 'available', true, 'draft', 'draft', 'partial', 'complete', current_date - 27),
('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'GAE-UAE-0003', 'LJXMG526GAE00003', 'MG', 'MG5', 2026, 'Luxury', 'new', 10, 'Silver', 'Black', '1.5L', 'CVT', 'FWD', 'Petrol', 'Sedan', 5, 4, 'CN', 'AE', 'Sharjah showroom', 45500, 3200, 5400, 1200, 600, 350, 68500, 'AED', 'available', true, 'listed', 'draft', 'complete', 'complete', current_date - 15),
('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'GAE-UAE-0004', 'KNASPGL26GAE0004', 'Kia', 'Sportage', 2026, 'GT-Line', 'new', 21, 'Wolf Gray', 'Red', '1.6L Turbo', 'Automatic', 'AWD', 'Petrol', 'SUV', 5, 5, 'KR', 'AE', 'Sharjah showroom', 112000, 5600, 13800, 2600, 900, 700, 158000, 'AED', 'under_preparation', true, 'not_listed', 'not_listed', 'missing', 'partial', current_date - 32),
('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'GAE-UAE-0005', 'JN8PATROL25GAE05', 'Nissan', 'Patrol', 2025, 'Platinum V6T', 'new', 38, 'Champagne Quartz', 'Tan', '3.5L Twin Turbo', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'AE', 'Sharjah export yard', 276000, 8800, 33300, 4800, 1600, 1100, 385000, 'AED', 'under_customs_clearance', true, 'draft', 'draft', 'partial', 'partial', current_date - 55),
('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'EMT-AUH-0001', 'JTGRS2025EMT00001', 'Toyota', 'Hilux', 2025, 'Adventure', 'new', 64, 'Graphite', 'Black', '2.8L Turbo Diesel', 'Automatic', '4WD', 'Diesel', 'Pickup', 5, 4, 'TH', 'AE', 'Abu Dhabi fleet yard', 136000, 7900, 17600, 3600, 1100, 700, 184000, 'AED', 'sold', false, 'sold', 'sold', 'verified', 'complete', current_date - 73),
('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'EMT-AUH-0002', 'JTEPRADO26EMT002', 'Toyota', 'Land Cruiser Prado', 2026, 'TX-L', 'new', 22, 'Metallic Gray', 'Black', '2.4L Turbo', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'AE', 'Abu Dhabi showroom', 205000, 9100, 25100, 4700, 1500, 1000, 289000, 'AED', 'available', true, 'listed', 'draft', 'complete', 'complete', current_date - 8),
('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'EMT-AUH-0003', 'JTLX60025EMT003', 'Lexus', 'LX 600', 2025, 'F Sport', 'new', 11, 'Manganese Luster', 'Red', '3.5L Twin Turbo', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'AE', 'Abu Dhabi showroom', 412000, 12500, 49500, 6900, 2400, 1900, 575000, 'AED', 'reserved', false, 'draft', 'not_listed', 'partial', 'complete', current_date - 19),
('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'EMT-AUH-0004', 'JN8PATROL25EMT004', 'Nissan', 'Patrol', 2025, 'Nismo', 'new', 42, 'White', 'Black', '5.6L V8', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'AE', 'Abu Dhabi showroom', 298000, 8900, 36200, 5200, 1700, 1200, 412000, 'AED', 'available', false, 'listed', 'listed', 'complete', 'complete', current_date - 24),
('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004', 'EMT-AUH-0005', 'W1NGCLASS24EMT005', 'Mercedes-Benz', 'G-Class', 2024, 'G 500', 'used', 11300, 'Selenite Gray', 'Black', '4.0L V8', 'Automatic', 'AWD', 'Petrol', 'SUV', 5, 5, 'DE', 'AE', 'Abu Dhabi showroom', 498000, 11200, 58300, 7600, 2300, 3100, 625000, 'AED', 'available', true, 'not_listed', 'not_listed', 'partial', 'partial', current_date - 67),
('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'SAI-ALG-0001', 'JTGRS2025SAI00001', 'Toyota', 'Hilux', 2025, 'GR Sport', 'new', 71, 'White', 'Black', '2.8L Turbo Diesel', 'Automatic', '4WD', 'Diesel', 'Pickup', 5, 4, 'TH', 'DZ', 'Algiers sales office', 5050000, 315000, 880000, 125000, 60000, 45000, 7350000, 'DZD', 'available', false, 'draft', 'draft', 'partial', 'complete', current_date - 13),
('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'SAI-ALG-0002', 'LJXJET25SAI00002', 'Jetour', 'T2', 2025, 'Luxury', 'new', 38, 'Sand', 'Black', '2.0L Turbo', 'DCT', '4WD', 'Petrol', 'SUV', 5, 5, 'CN', 'DZ', 'Algiers showroom', 2870000, 210000, 520000, 80000, 42000, 30000, 4350000, 'DZD', 'available', false, 'listed', 'draft', 'complete', 'complete', current_date - 29),
('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'SAI-ALG-0003', 'LJXMG526SAI00003', 'MG', 'MG5', 2026, 'Comfort', 'new', 12, 'Blue', 'Black', '1.5L', 'CVT', 'FWD', 'Petrol', 'Sedan', 5, 4, 'CN', 'DZ', 'Algiers showroom', 1780000, 145000, 335000, 55000, 25000, 18000, 2680000, 'DZD', 'available', false, 'listed', 'listed', 'complete', 'complete', current_date - 17),
('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'SAI-ALG-0004', 'KNASPGL26SAI0004', 'Kia', 'Sportage', 2026, 'GT-Line', 'new', 31, 'Black', 'Red', '1.6L Turbo', 'Automatic', 'AWD', 'Petrol', 'SUV', 5, 5, 'KR', 'DZ', 'Algiers showroom', 4240000, 230000, 720000, 95000, 47000, 33000, 6120000, 'DZD', 'under_preparation', false, 'draft', 'not_listed', 'partial', 'partial', current_date - 44),
('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000005', 'SAI-ALG-0005', 'JTEPRADO26SAI005', 'Toyota', 'Land Cruiser Prado', 2026, 'VX', 'new', 18, 'Pearl White', 'Beige', '2.4L Turbo', 'Automatic', '4WD', 'Petrol', 'SUV', 7, 5, 'JP', 'DZ', 'Algiers sales office', 8120000, 365000, 1420000, 160000, 70000, 52000, 11850000, 'DZD', 'reserved', false, 'not_listed', 'not_listed', 'partial', 'complete', current_date - 39);

insert into public.vehicle_costs (
  company_id,
  vehicle_id,
  purchase_price,
  shipping_cost,
  customs_cost,
  transport_cost,
  inspection_cost,
  repair_cost,
  detailing_cost,
  marketing_cost,
  commission_cost,
  other_expenses,
  selling_price,
  currency_code
)
select
  company_id,
  id,
  purchase_price,
  shipping_cost,
  customs_cost,
  0,
  0,
  preparation_cost,
  0,
  marketing_cost,
  0,
  other_expenses,
  selling_price,
  currency_code
from public.vehicles
where company_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);
