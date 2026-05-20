create type public.part_status as enum ('active', 'inactive', 'archived');
create type public.part_stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'reserved');
create type public.part_order_status as enum ('draft', 'ordered', 'partially_received', 'received', 'cancelled');
create type public.part_transfer_status as enum ('draft', 'in_transit', 'received', 'cancelled');
create type public.part_receipt_status as enum ('draft', 'posted', 'cancelled');
create type public.service_part_line_status as enum ('reserved', 'used', 'returned', 'cancelled');
create type public.part_reorder_alert_status as enum ('open', 'ordered', 'resolved', 'cancelled');

insert into public.modules (module_key, name, description, sort_order, is_core) values
('parts', 'Parts Inventory', 'Parts catalog, branch stock, suppliers, purchase orders, transfers, and service consumption.', 86, false)
on conflict (module_key) do nothing;

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key = 'parts'
where p.package_key in ('showroom_pro', 'export_business', 'enterprise_dealer_group')
on conflict (package_id, module_id) do update set enabled = excluded.enabled;

insert into public.permissions (module_key, action_key, permission_key, description) values
('parts', 'view', 'view_parts', 'View parts catalog, stock, purchasing, and service parts usage.'),
('parts', 'manage', 'manage_parts', 'Create and manage parts catalog, suppliers, stock, and service usage.'),
('parts', 'manage_orders', 'manage_part_orders', 'Create and manage parts purchase orders and receipts.'),
('parts', 'transfer', 'transfer_parts', 'Transfer parts between branches.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager', 'branch_manager', 'inventory_manager')
  and p.permission_key in ('view_parts', 'manage_parts', 'manage_part_orders', 'transfer_parts')
on conflict (role_id, permission_id) do nothing;

create table public.part_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_name text not null,
  country_code char(2),
  contact_name text,
  email text,
  phone text,
  status public.part_status not null default 'active',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, supplier_name),
  unique (id, company_id)
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_number text not null,
  sku text,
  name text not null,
  category text,
  brand text,
  compatible_brands text[] not null default '{}',
  compatible_models text[] not null default '{}',
  unit_cost numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  status public.part_status not null default 'active',
  reorder_point numeric(14,2) not null default 0,
  reorder_quantity numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, part_number),
  unique (id, company_id),
  constraint parts_amounts_check check (unit_cost >= 0 and selling_price >= 0 and reorder_point >= 0 and reorder_quantity >= 0)
);

create table public.part_stock (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  part_id uuid not null,
  quantity_on_hand numeric(14,2) not null default 0,
  quantity_reserved numeric(14,2) not null default 0,
  quantity_available numeric(14,2) generated always as (quantity_on_hand - quantity_reserved) stored,
  average_cost numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  bin_location text,
  status public.part_stock_status not null default 'out_of_stock',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, branch_id, part_id),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (part_id, company_id) references public.parts(id, company_id) on delete cascade,
  constraint part_stock_quantity_check check (quantity_on_hand >= 0 and quantity_reserved >= 0 and quantity_on_hand >= quantity_reserved and average_cost >= 0)
);

create table public.part_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  supplier_id uuid,
  purchase_order_number text not null,
  status public.part_order_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, purchase_order_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (supplier_id, company_id) references public.part_suppliers(id, company_id) on delete set null (supplier_id),
  constraint part_po_amounts_check check (subtotal >= 0 and tax_amount >= 0 and total_amount >= 0)
);

create table public.part_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_order_id uuid not null,
  part_id uuid not null,
  description text,
  quantity_ordered numeric(14,2) not null default 0,
  quantity_received numeric(14,2) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (purchase_order_id, company_id) references public.part_purchase_orders(id, company_id) on delete cascade,
  foreign key (part_id, company_id) references public.parts(id, company_id) on delete restrict,
  constraint part_po_items_amounts_check check (quantity_ordered >= 0 and quantity_received >= 0 and quantity_received <= quantity_ordered and unit_cost >= 0 and line_total >= 0)
);

create table public.part_receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  purchase_order_id uuid,
  receipt_number text not null,
  status public.part_receipt_status not null default 'posted',
  received_at timestamptz not null default now(),
  posted_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, receipt_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (purchase_order_id, company_id) references public.part_purchase_orders(id, company_id) on delete set null (purchase_order_id)
);

create table public.part_receipt_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_receipt_id uuid not null,
  purchase_order_item_id uuid,
  part_id uuid not null,
  quantity_received numeric(14,2) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (part_receipt_id, company_id) references public.part_receipts(id, company_id) on delete cascade,
  foreign key (purchase_order_item_id, company_id) references public.part_purchase_order_items(id, company_id) on delete set null (purchase_order_item_id),
  foreign key (part_id, company_id) references public.parts(id, company_id) on delete restrict,
  constraint part_receipt_items_amounts_check check (quantity_received >= 0 and unit_cost >= 0 and line_total >= 0)
);

create table public.part_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_id uuid not null,
  from_branch_id uuid not null,
  to_branch_id uuid not null,
  transfer_number text not null,
  quantity numeric(14,2) not null default 0,
  status public.part_transfer_status not null default 'draft',
  shipped_at timestamptz,
  received_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, transfer_number),
  unique (id, company_id),
  foreign key (part_id, company_id) references public.parts(id, company_id) on delete restrict,
  foreign key (from_branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (to_branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  constraint part_transfers_quantity_check check (quantity > 0 and from_branch_id <> to_branch_id)
);

create table public.service_parts_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  service_order_id uuid not null,
  service_job_id uuid,
  part_id uuid not null,
  line_number text not null,
  description text not null,
  quantity numeric(14,2) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  selling_price numeric(14,2) not null default 0,
  line_cost numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  status public.service_part_line_status not null default 'used',
  used_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, line_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (service_order_id, company_id) references public.service_orders(id, company_id) on delete cascade,
  foreign key (service_job_id, company_id) references public.service_jobs(id, company_id) on delete set null (service_job_id),
  foreign key (part_id, company_id) references public.parts(id, company_id) on delete restrict,
  constraint service_parts_lines_amounts_check check (quantity > 0 and unit_cost >= 0 and selling_price >= 0 and line_cost >= 0 and line_total >= 0)
);

create table public.part_reorder_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  part_id uuid not null,
  alert_number text not null,
  current_quantity numeric(14,2) not null default 0,
  reorder_point numeric(14,2) not null default 0,
  status public.part_reorder_alert_status not null default 'open',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  deleted_at timestamptz,
  unique (company_id, alert_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete cascade,
  foreign key (part_id, company_id) references public.parts(id, company_id) on delete cascade,
  constraint part_reorder_alerts_amounts_check check (current_quantity >= 0 and reorder_point >= 0)
);

create or replace function public.set_part_stock_status()
returns trigger
language plpgsql
as $$
declare
  reorder numeric(14,2);
  available numeric(14,2);
begin
  select coalesce(reorder_point, 0) into reorder from public.parts where id = new.part_id and company_id = new.company_id;
  available := coalesce(new.quantity_on_hand, 0) - coalesce(new.quantity_reserved, 0);

  if available <= 0 then
    new.status := 'out_of_stock'::public.part_stock_status;
  elsif available <= coalesce(reorder, 0) then
    new.status := 'low_stock'::public.part_stock_status;
  else
    new.status := 'in_stock'::public.part_stock_status;
  end if;

  return new;
end;
$$;

create or replace function public.set_part_purchase_order_item_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total := round(coalesce(new.quantity_ordered, 0) * coalesce(new.unit_cost, 0), 2);
  return new;
end;
$$;

create or replace function app_private.refresh_part_purchase_order_totals(target_po_id uuid, target_company_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  items_subtotal numeric(14,2);
begin
  select coalesce(round(sum(line_total), 2), 0)
  into items_subtotal
  from public.part_purchase_order_items
  where purchase_order_id = target_po_id
    and company_id = target_company_id
    and deleted_at is null;

  update public.part_purchase_orders
  set subtotal = items_subtotal,
      total_amount = items_subtotal + coalesce(tax_amount, 0),
      updated_at = now()
  where id = target_po_id
    and company_id = target_company_id;
end;
$$;

create or replace function app_private.refresh_part_purchase_order_totals_from_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform app_private.refresh_part_purchase_order_totals(coalesce(new.purchase_order_id, old.purchase_order_id), coalesce(new.company_id, old.company_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.set_part_receipt_item_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total := round(coalesce(new.quantity_received, 0) * coalesce(new.unit_cost, 0), 2);
  return new;
end;
$$;

create or replace function app_private.apply_part_receipt_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  receipt_branch uuid;
  receipt_status public.part_receipt_status;
  po_id uuid;
  ordered_qty numeric(14,2);
  received_qty numeric(14,2);
begin
  select branch_id, status, purchase_order_id
  into receipt_branch, receipt_status, po_id
  from public.part_receipts
  where id = new.part_receipt_id
    and company_id = new.company_id;

  if receipt_status <> 'posted'::public.part_receipt_status then
    return new;
  end if;

  insert into public.part_stock (company_id, branch_id, part_id, quantity_on_hand, average_cost, currency_code, created_by, updated_by)
  select new.company_id, receipt_branch, new.part_id, new.quantity_received, new.unit_cost, p.currency_code, new.created_by, new.updated_by
  from public.parts p
  where p.id = new.part_id and p.company_id = new.company_id
  on conflict (company_id, branch_id, part_id)
  do update set quantity_on_hand = public.part_stock.quantity_on_hand + excluded.quantity_on_hand,
                average_cost = case
                  when public.part_stock.quantity_on_hand + excluded.quantity_on_hand > 0
                  then round(((public.part_stock.quantity_on_hand * public.part_stock.average_cost) + (excluded.quantity_on_hand * excluded.average_cost)) / (public.part_stock.quantity_on_hand + excluded.quantity_on_hand), 2)
                  else excluded.average_cost
                end,
                updated_by = excluded.updated_by,
                updated_at = now(),
                deleted_at = null;

  if new.purchase_order_item_id is not null then
    update public.part_purchase_order_items
    set quantity_received = least(quantity_ordered, quantity_received + new.quantity_received),
        updated_by = new.updated_by,
        updated_at = now()
    where id = new.purchase_order_item_id
      and company_id = new.company_id;
  end if;

  if po_id is not null then
    select coalesce(sum(quantity_ordered), 0), coalesce(sum(quantity_received), 0)
    into ordered_qty, received_qty
    from public.part_purchase_order_items
    where purchase_order_id = po_id
      and company_id = new.company_id
      and deleted_at is null;

    update public.part_purchase_orders
    set status = case
      when ordered_qty > 0 and received_qty >= ordered_qty then 'received'::public.part_order_status
      when received_qty > 0 then 'partially_received'::public.part_order_status
      else status
    end,
    updated_at = now()
    where id = po_id
      and company_id = new.company_id;
  end if;

  update public.part_receipts
  set posted_at = coalesce(posted_at, now()),
      updated_at = now()
  where id = new.part_receipt_id
    and company_id = new.company_id;

  return new;
end;
$$;

create or replace function app_private.apply_part_transfer()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_available numeric(14,2);
  part_currency char(3);
begin
  if new.status <> 'received'::public.part_transfer_status then
    return new;
  end if;

  select currency_code into part_currency from public.parts where id = new.part_id and company_id = new.company_id;

  select quantity_available
  into source_available
  from public.part_stock
  where company_id = new.company_id
    and branch_id = new.from_branch_id
    and part_id = new.part_id
  for update;

  if coalesce(source_available, 0) < new.quantity then
    raise exception 'Insufficient part stock for transfer.';
  end if;

  update public.part_stock
  set quantity_on_hand = quantity_on_hand - new.quantity,
      updated_by = new.updated_by,
      updated_at = now()
  where company_id = new.company_id
    and branch_id = new.from_branch_id
    and part_id = new.part_id;

  insert into public.part_stock (company_id, branch_id, part_id, quantity_on_hand, currency_code, created_by, updated_by)
  values (new.company_id, new.to_branch_id, new.part_id, new.quantity, coalesce(part_currency, 'AED'), new.created_by, new.updated_by)
  on conflict (company_id, branch_id, part_id)
  do update set quantity_on_hand = public.part_stock.quantity_on_hand + excluded.quantity_on_hand,
                updated_by = excluded.updated_by,
                updated_at = now(),
                deleted_at = null;

  new.shipped_at := coalesce(new.shipped_at, now());
  new.received_at := coalesce(new.received_at, now());
  return new;
end;
$$;

create or replace function public.set_service_part_line_totals()
returns trigger
language plpgsql
as $$
begin
  new.line_cost := round(coalesce(new.quantity, 0) * coalesce(new.unit_cost, 0), 2);
  new.line_total := round(coalesce(new.quantity, 0) * coalesce(new.selling_price, 0), 2);
  new.gross_profit := round(new.line_total - new.line_cost, 2);
  return new;
end;
$$;

create or replace function app_private.refresh_service_order_totals(target_order_id uuid, target_company_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  labor_sum numeric(14,2);
  parts_sum numeric(14,2);
begin
  select coalesce(round(sum(amount), 2), 0)
  into labor_sum
  from public.service_labor_lines
  where service_order_id = target_order_id
    and company_id = target_company_id
    and deleted_at is null;

  select coalesce(round(sum(line_total), 2), 0)
  into parts_sum
  from public.service_parts_lines
  where service_order_id = target_order_id
    and company_id = target_company_id
    and status = 'used'::public.service_part_line_status
    and deleted_at is null;

  update public.service_orders
  set labor_total = labor_sum,
      parts_total = parts_sum,
      total_amount = labor_sum + parts_sum,
      updated_at = now()
  where id = target_order_id
    and company_id = target_company_id;
end;
$$;

create or replace function app_private.apply_service_part_line()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  available_qty numeric(14,2);
begin
  if new.status = 'used'::public.service_part_line_status then
    select quantity_available
    into available_qty
    from public.part_stock
    where company_id = new.company_id
      and branch_id = new.branch_id
      and part_id = new.part_id
    for update;

    if coalesce(available_qty, 0) < new.quantity then
      raise exception 'Insufficient part stock for service usage.';
    end if;

    update public.part_stock
    set quantity_on_hand = quantity_on_hand - new.quantity,
        updated_by = new.updated_by,
        updated_at = now()
    where company_id = new.company_id
      and branch_id = new.branch_id
      and part_id = new.part_id;
  end if;

  perform app_private.refresh_service_order_totals(new.service_order_id, new.company_id);
  return new;
end;
$$;

create or replace function app_private.refresh_service_order_totals_from_part_line()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform app_private.refresh_service_order_totals(coalesce(new.service_order_id, old.service_order_id), coalesce(new.company_id, old.company_id));
  return coalesce(new, old);
end;
$$;

create or replace function app_private.create_part_reorder_alert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reorder numeric(14,2);
begin
  select reorder_point into reorder from public.parts where id = new.part_id and company_id = new.company_id;

  if coalesce(reorder, 0) > 0 and new.quantity_available <= reorder then
    insert into public.part_reorder_alerts (company_id, branch_id, part_id, alert_number, current_quantity, reorder_point, status, created_by, updated_by)
    values (new.company_id, new.branch_id, new.part_id, 'PRA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), greatest(new.quantity_available, 0), reorder, 'open'::public.part_reorder_alert_status, new.updated_by, new.updated_by)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger part_suppliers_set_updated_at before update on public.part_suppliers for each row execute function public.set_updated_at();
create trigger parts_set_updated_at before update on public.parts for each row execute function public.set_updated_at();
create trigger part_stock_set_updated_at before update on public.part_stock for each row execute function public.set_updated_at();
create trigger part_purchase_orders_set_updated_at before update on public.part_purchase_orders for each row execute function public.set_updated_at();
create trigger part_purchase_order_items_set_updated_at before update on public.part_purchase_order_items for each row execute function public.set_updated_at();
create trigger part_receipts_set_updated_at before update on public.part_receipts for each row execute function public.set_updated_at();
create trigger part_receipt_items_set_updated_at before update on public.part_receipt_items for each row execute function public.set_updated_at();
create trigger part_transfers_set_updated_at before update on public.part_transfers for each row execute function public.set_updated_at();
create trigger service_parts_lines_set_updated_at before update on public.service_parts_lines for each row execute function public.set_updated_at();
create trigger part_reorder_alerts_set_updated_at before update on public.part_reorder_alerts for each row execute function public.set_updated_at();
create trigger part_stock_set_status before insert or update on public.part_stock for each row execute function public.set_part_stock_status();
create trigger part_stock_create_reorder_alert after insert or update on public.part_stock for each row execute function app_private.create_part_reorder_alert();
create trigger part_purchase_order_items_set_total before insert or update on public.part_purchase_order_items for each row execute function public.set_part_purchase_order_item_total();
create trigger part_purchase_order_items_refresh_po after insert or update or delete on public.part_purchase_order_items for each row execute function app_private.refresh_part_purchase_order_totals_from_item();
create trigger part_receipt_items_set_total before insert or update on public.part_receipt_items for each row execute function public.set_part_receipt_item_total();
create trigger part_receipt_items_apply_stock after insert on public.part_receipt_items for each row execute function app_private.apply_part_receipt_item();
create trigger part_transfers_apply before insert on public.part_transfers for each row execute function app_private.apply_part_transfer();
create trigger service_parts_lines_set_totals before insert or update on public.service_parts_lines for each row execute function public.set_service_part_line_totals();
create trigger service_parts_lines_apply after insert on public.service_parts_lines for each row execute function app_private.apply_service_part_line();
create trigger service_parts_lines_refresh_order after update or delete on public.service_parts_lines for each row execute function app_private.refresh_service_order_totals_from_part_line();

create index part_suppliers_company_status_idx on public.part_suppliers(company_id, status) where deleted_at is null;
create index parts_company_status_idx on public.parts(company_id, status, category) where deleted_at is null;
create index part_stock_company_branch_idx on public.part_stock(company_id, branch_id, status) where deleted_at is null;
create index part_stock_company_part_idx on public.part_stock(company_id, part_id) where deleted_at is null;
create index part_purchase_orders_company_branch_idx on public.part_purchase_orders(company_id, branch_id, status, created_at desc) where deleted_at is null;
create index part_purchase_items_company_po_idx on public.part_purchase_order_items(company_id, purchase_order_id) where deleted_at is null;
create index part_receipts_company_branch_idx on public.part_receipts(company_id, branch_id, received_at desc) where deleted_at is null;
create index part_receipt_items_company_receipt_idx on public.part_receipt_items(company_id, part_receipt_id) where deleted_at is null;
create index part_transfers_company_branch_idx on public.part_transfers(company_id, from_branch_id, to_branch_id, status) where deleted_at is null;
create index service_parts_company_order_idx on public.service_parts_lines(company_id, service_order_id, status) where deleted_at is null;
create index part_reorder_alerts_company_branch_idx on public.part_reorder_alerts(company_id, branch_id, status) where deleted_at is null;

grant select, insert, update, delete on public.part_suppliers to authenticated;
grant select, insert, update, delete on public.parts to authenticated;
grant select, insert, update, delete on public.part_stock to authenticated;
grant select, insert, update, delete on public.part_purchase_orders to authenticated;
grant select, insert, update, delete on public.part_purchase_order_items to authenticated;
grant select, insert, update, delete on public.part_receipts to authenticated;
grant select, insert, update, delete on public.part_receipt_items to authenticated;
grant select, insert, update, delete on public.part_transfers to authenticated;
grant select, insert, update, delete on public.service_parts_lines to authenticated;
grant select, insert, update, delete on public.part_reorder_alerts to authenticated;

alter table public.part_suppliers enable row level security;
alter table public.parts enable row level security;
alter table public.part_stock enable row level security;
alter table public.part_purchase_orders enable row level security;
alter table public.part_purchase_order_items enable row level security;
alter table public.part_receipts enable row level security;
alter table public.part_receipt_items enable row level security;
alter table public.part_transfers enable row level security;
alter table public.service_parts_lines enable row level security;
alter table public.part_reorder_alerts enable row level security;

create policy "part_suppliers_select_parts" on public.part_suppliers
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_part_orders')));
create policy "part_suppliers_manage_parts" on public.part_suppliers
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_part_orders'))
  with check (app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_part_orders'));

create policy "parts_select_parts" on public.parts
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_part_orders') or app_private.has_company_permission(company_id, 'transfer_parts')));
create policy "parts_manage_parts" on public.parts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_parts'))
  with check (app_private.has_company_permission(company_id, 'manage_parts'));

create policy "part_stock_select_parts" on public.part_stock
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'transfer_parts')) and app_private.can_access_branch(company_id, branch_id));
create policy "part_stock_manage_parts" on public.part_stock
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_parts'))
  with check (app_private.has_company_permission(company_id, 'manage_parts') and app_private.can_access_branch(company_id, branch_id));

create policy "part_purchase_orders_select_parts" on public.part_purchase_orders
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'manage_part_orders')) and app_private.can_access_branch(company_id, branch_id));
create policy "part_purchase_orders_manage_parts" on public.part_purchase_orders
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_part_orders'))
  with check (app_private.has_company_permission(company_id, 'manage_part_orders') and app_private.can_access_branch(company_id, branch_id));

create policy "part_purchase_items_select_parts" on public.part_purchase_order_items
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.part_purchase_orders po
      where po.id = part_purchase_order_items.purchase_order_id
        and po.company_id = part_purchase_order_items.company_id
        and po.deleted_at is null
        and (app_private.has_company_permission(po.company_id, 'view_parts') or app_private.has_company_permission(po.company_id, 'manage_part_orders'))
        and app_private.can_access_branch(po.company_id, po.branch_id)
    )
  );
create policy "part_purchase_items_manage_parts" on public.part_purchase_order_items
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_part_orders'))
  with check (app_private.has_company_permission(company_id, 'manage_part_orders'));

create policy "part_receipts_select_parts" on public.part_receipts
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'manage_part_orders')) and app_private.can_access_branch(company_id, branch_id));
create policy "part_receipts_manage_parts" on public.part_receipts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_part_orders'))
  with check (app_private.has_company_permission(company_id, 'manage_part_orders') and app_private.can_access_branch(company_id, branch_id));

create policy "part_receipt_items_select_parts" on public.part_receipt_items
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.part_receipts r
      where r.id = part_receipt_items.part_receipt_id
        and r.company_id = part_receipt_items.company_id
        and r.deleted_at is null
        and (app_private.has_company_permission(r.company_id, 'view_parts') or app_private.has_company_permission(r.company_id, 'manage_part_orders'))
        and app_private.can_access_branch(r.company_id, r.branch_id)
    )
  );
create policy "part_receipt_items_manage_parts" on public.part_receipt_items
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_part_orders'))
  with check (app_private.has_company_permission(company_id, 'manage_part_orders'));

create policy "part_transfers_select_parts" on public.part_transfers
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'transfer_parts') or app_private.has_company_permission(company_id, 'manage_parts')) and app_private.can_access_branch(company_id, from_branch_id) and app_private.can_access_branch(company_id, to_branch_id));
create policy "part_transfers_manage_parts" on public.part_transfers
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'transfer_parts') or app_private.has_company_permission(company_id, 'manage_parts'))
  with check ((app_private.has_company_permission(company_id, 'transfer_parts') or app_private.has_company_permission(company_id, 'manage_parts')) and app_private.can_access_branch(company_id, from_branch_id) and app_private.can_access_branch(company_id, to_branch_id));

create policy "service_parts_lines_select_parts" on public.service_parts_lines
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));
create policy "service_parts_lines_manage_parts" on public.service_parts_lines
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_service'))
  with check ((app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));

create policy "part_reorder_alerts_select_parts" on public.part_reorder_alerts
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_parts') or app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_part_orders')) and app_private.can_access_branch(company_id, branch_id));
create policy "part_reorder_alerts_manage_parts" on public.part_reorder_alerts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_part_orders'))
  with check ((app_private.has_company_permission(company_id, 'manage_parts') or app_private.has_company_permission(company_id, 'manage_part_orders')) and app_private.can_access_branch(company_id, branch_id));

insert into public.part_suppliers (company_id, supplier_name, country_code, contact_name, email, phone)
select c.id, 'Gulf Genuine Parts', 'AE', 'Parts Desk', 'parts@gulfgenuine.example', '+971500000099'
from public.companies c
on conflict (company_id, supplier_name) do nothing;

insert into public.parts (company_id, part_number, sku, name, category, brand, compatible_brands, compatible_models, unit_cost, selling_price, currency_code, reorder_point, reorder_quantity)
select c.id, 'LX-FILTER-001', 'LX-FILTER-001', 'LX 600 Oil Filter', 'Engine', 'Lexus', array['Lexus'], array['LX 600'], 120, 185, coalesce(c.primary_currency_code, 'AED'), 3, 10
from public.companies c
on conflict (company_id, part_number) do nothing;

insert into public.part_stock (company_id, branch_id, part_id, quantity_on_hand, average_cost, currency_code)
select b.company_id, b.id, p.id, 8, p.unit_cost, p.currency_code
from public.branches b
join public.parts p on p.company_id = b.company_id and p.part_number = 'LX-FILTER-001'
where b.deleted_at is null
on conflict (company_id, branch_id, part_id) do nothing;
