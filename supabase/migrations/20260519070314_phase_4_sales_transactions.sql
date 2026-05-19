create type public.quotation_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
create type public.reservation_status as enum ('active', 'expired', 'cancelled', 'converted');
create type public.payment_status as enum ('unpaid', 'deposit_paid', 'partial_payment', 'paid', 'overdue', 'refunded');
create type public.proforma_status as enum ('draft', 'sent', 'accepted', 'cancelled', 'converted');
create type public.invoice_status as enum ('draft', 'sent', 'partial_payment', 'paid', 'cancelled', 'overdue');
create type public.signature_status as enum ('not_required', 'pending', 'sent', 'signed', 'rejected', 'expired');
create type public.payment_type as enum ('deposit', 'final_payment', 'partial_payment', 'refund');
create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'cheque', 'online_payment', 'crypto_placeholder');
create type public.payment_record_status as enum ('pending', 'completed', 'failed', 'reversed');

insert into public.permissions (module_key, action_key, permission_key, description) values
('sales', 'view', 'view_sales', 'View sales documents and workflow records.'),
('sales', 'update_quotation', 'update_quotation', 'Update quotations and sales workflow records.'),
('sales', 'view_payments', 'view_payments', 'View payment records.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin')
  and p.permission_key in (
    'view_sales',
    'update_quotation',
    'view_payments',
    'create_quotation',
    'approve_discount',
    'reserve_vehicle',
    'create_invoice',
    'record_payment'
  )
on conflict (role_id, permission_id) do nothing;

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  quotation_number text not null,
  customer_id uuid,
  lead_id uuid,
  vehicle_id uuid not null,
  price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  valid_until date not null default (current_date + 7),
  notes text,
  salesperson_id uuid references public.profiles(id),
  status public.quotation_status not null default 'draft',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, quotation_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete set null (lead_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete restrict,
  constraint quotations_amounts_check check (price >= 0 and discount >= 0 and tax >= 0)
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quotation_id uuid not null,
  vehicle_id uuid,
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (quotation_id, company_id) references public.quotations(id, company_id) on delete cascade,
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  constraint quotation_items_amounts_check check (quantity > 0 and unit_price >= 0 and discount >= 0 and tax >= 0)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  reservation_number text not null,
  quotation_id uuid,
  lead_id uuid,
  customer_id uuid,
  vehicle_id uuid not null,
  deposit_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  reservation_date date not null default current_date,
  expiry_date date not null default (current_date + 7),
  payment_status public.payment_status not null default 'unpaid',
  agreement_signature_status public.signature_status not null default 'not_required',
  status public.reservation_status not null default 'active',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, reservation_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (quotation_id, company_id) references public.quotations(id, company_id) on delete set null (quotation_id),
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete set null (lead_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete restrict,
  constraint reservations_deposit_check check (deposit_amount >= 0)
);

create table public.proforma_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  proforma_number text not null,
  quotation_id uuid,
  reservation_id uuid,
  customer_id uuid,
  lead_id uuid,
  vehicle_id uuid not null,
  export_destination text,
  vehicle_price numeric(14,2) not null default 0,
  shipping_estimate numeric(14,2) not null default 0,
  additional_fees numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  payment_terms text,
  signature_status public.signature_status not null default 'not_required',
  status public.proforma_status not null default 'draft',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, proforma_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (quotation_id, company_id) references public.quotations(id, company_id) on delete set null (quotation_id),
  foreign key (reservation_id, company_id) references public.reservations(id, company_id) on delete set null (reservation_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete set null (lead_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete restrict,
  constraint proforma_amounts_check check (vehicle_price >= 0 and shipping_estimate >= 0 and additional_fees >= 0 and tax >= 0)
);

create table public.proforma_invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  proforma_invoice_id uuid not null,
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (proforma_invoice_id, company_id) references public.proforma_invoices(id, company_id) on delete cascade,
  constraint proforma_items_amounts_check check (quantity > 0 and unit_price >= 0)
);

create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  invoice_number text not null,
  quotation_id uuid,
  reservation_id uuid,
  proforma_invoice_id uuid,
  customer_id uuid,
  lead_id uuid,
  vehicle_id uuid not null,
  final_price numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  due_date date not null default (current_date + 7),
  payment_method public.payment_method,
  invoice_status public.invoice_status not null default 'draft',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, invoice_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (quotation_id, company_id) references public.quotations(id, company_id) on delete set null (quotation_id),
  foreign key (reservation_id, company_id) references public.reservations(id, company_id) on delete set null (reservation_id),
  foreign key (proforma_invoice_id, company_id) references public.proforma_invoices(id, company_id) on delete set null (proforma_invoice_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete set null (lead_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete restrict,
  constraint sales_invoices_amounts_check check (final_price >= 0 and tax >= 0 and paid_amount >= 0 and balance_due >= 0)
);

create table public.sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sales_invoice_id uuid not null,
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (sales_invoice_id, company_id) references public.sales_invoices(id, company_id) on delete cascade,
  constraint sales_invoice_items_amounts_check check (quantity > 0 and unit_price >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  payment_number text not null,
  customer_id uuid,
  vehicle_id uuid,
  related_invoice_id uuid,
  reservation_id uuid,
  payment_type public.payment_type not null default 'partial_payment',
  amount numeric(14,2) not null,
  currency_code char(3) not null default 'AED',
  payment_method public.payment_method not null default 'cash',
  payment_date date not null default current_date,
  status public.payment_record_status not null default 'completed',
  received_by uuid references public.profiles(id),
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, payment_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (related_invoice_id, company_id) references public.sales_invoices(id, company_id) on delete set null (related_invoice_id),
  foreign key (reservation_id, company_id) references public.reservations(id, company_id) on delete set null (reservation_id),
  constraint payments_amount_check check (amount > 0)
);

create or replace function public.calculate_sales_total(
  subtotal numeric,
  discount numeric,
  tax numeric
)
returns numeric
language sql
immutable
as $$
  select greatest(round(coalesce(subtotal, 0) - coalesce(discount, 0) + coalesce(tax, 0), 2), 0)
$$;

create or replace function public.set_quotation_total()
returns trigger
language plpgsql
as $$
begin
  new.total := public.calculate_sales_total(new.price, new.discount, new.tax);
  return new;
end;
$$;

create or replace function public.set_line_total()
returns trigger
language plpgsql
as $$
begin
  new.total := public.calculate_sales_total(coalesce(new.quantity, 1) * coalesce(new.unit_price, 0), coalesce(new.discount, 0), coalesce(new.tax, 0));
  return new;
end;
$$;

create or replace function public.set_simple_line_total()
returns trigger
language plpgsql
as $$
begin
  new.total := round(coalesce(new.quantity, 1) * coalesce(new.unit_price, 0), 2);
  return new;
end;
$$;

create or replace function public.set_proforma_total()
returns trigger
language plpgsql
as $$
begin
  new.total := public.calculate_sales_total(
    coalesce(new.vehicle_price, 0) + coalesce(new.shipping_estimate, 0) + coalesce(new.additional_fees, 0),
    0,
    new.tax
  );
  return new;
end;
$$;

create or replace function public.set_invoice_total()
returns trigger
language plpgsql
as $$
begin
  new.total := public.calculate_sales_total(new.final_price, 0, new.tax);
  new.balance_due := greatest(round(new.total - coalesce(new.paid_amount, 0), 2), 0);
  if new.paid_amount <= 0 then
    new.invoice_status := case
      when new.invoice_status = 'cancelled' then 'cancelled'
      when new.invoice_status in ('draft', 'sent', 'overdue') then new.invoice_status
      else 'sent'
    end;
  elsif new.balance_due <= 0 then
    new.invoice_status := 'paid';
  elsif new.invoice_status <> 'cancelled' then
    new.invoice_status := 'partial_payment';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_unavailable_reservation()
returns trigger
language plpgsql
as $$
declare
  current_vehicle_status public.vehicle_status;
begin
  select status into current_vehicle_status
  from public.vehicles
  where id = new.vehicle_id
    and company_id = new.company_id
    and deleted_at is null;

  if current_vehicle_status is null then
    raise exception 'Vehicle was not found for reservation.';
  end if;

  if current_vehicle_status in ('reserved', 'sold', 'delivered', 'cancelled') then
    raise exception 'Vehicle cannot be reserved while status is %.', current_vehicle_status;
  end if;

  return new;
end;
$$;

create or replace function public.after_reservation_created()
returns trigger
language plpgsql
as $$
begin
  update public.vehicles
  set status = 'reserved',
      updated_by = new.created_by
  where id = new.vehicle_id
    and company_id = new.company_id;

  update public.leads
  set status = 'reserved',
      updated_by = new.created_by
  where id = new.lead_id
    and company_id = new.company_id;

  update public.quotations
  set status = 'converted',
      updated_by = new.created_by
  where id = new.quotation_id
    and company_id = new.company_id;

  return new;
end;
$$;

create or replace function public.refresh_invoice_payment_totals(target_invoice_id uuid, target_company_id uuid)
returns void
language plpgsql
as $$
declare
  paid numeric(14,2);
  invoice_total numeric(14,2);
  invoice_vehicle_id uuid;
begin
  select coalesce(sum(
    case when payment_type = 'refund' then -amount else amount end
  ), 0)
  into paid
  from public.payments
  where related_invoice_id = target_invoice_id
    and company_id = target_company_id
    and status = 'completed'
    and deleted_at is null;

  select total, vehicle_id
  into invoice_total, invoice_vehicle_id
  from public.sales_invoices
  where id = target_invoice_id
    and company_id = target_company_id
    and deleted_at is null;

  if invoice_total is null then
    return;
  end if;

  update public.sales_invoices
  set paid_amount = greatest(paid, 0),
      balance_due = greatest(round(invoice_total - greatest(paid, 0), 2), 0),
      invoice_status = case
        when greatest(paid, 0) <= 0 then 'sent'::public.invoice_status
        when greatest(round(invoice_total - greatest(paid, 0), 2), 0) <= 0 then 'paid'::public.invoice_status
        else 'partial_payment'::public.invoice_status
      end
  where id = target_invoice_id
    and company_id = target_company_id;

  if greatest(round(invoice_total - greatest(paid, 0), 2), 0) <= 0 then
    update public.vehicles
    set status = 'sold'
    where id = invoice_vehicle_id
      and company_id = target_company_id;
  end if;
end;
$$;

create or replace function public.after_payment_changed()
returns trigger
language plpgsql
as $$
begin
  if new.related_invoice_id is not null then
    perform public.refresh_invoice_payment_totals(new.related_invoice_id, new.company_id);
  end if;

  if new.reservation_id is not null
    and new.payment_type = 'deposit'
    and new.status = 'completed' then
    update public.reservations
    set payment_status = 'deposit_paid',
        updated_by = new.created_by
    where id = new.reservation_id
      and company_id = new.company_id;
  end if;

  return new;
end;
$$;

create trigger quotations_set_updated_at before update on public.quotations for each row execute function public.set_updated_at();
create trigger reservations_set_updated_at before update on public.reservations for each row execute function public.set_updated_at();
create trigger proforma_invoices_set_updated_at before update on public.proforma_invoices for each row execute function public.set_updated_at();
create trigger sales_invoices_set_updated_at before update on public.sales_invoices for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger quotations_set_total before insert or update on public.quotations for each row execute function public.set_quotation_total();
create trigger quotation_items_set_total before insert or update on public.quotation_items for each row execute function public.set_line_total();
create trigger proforma_invoices_set_total before insert or update on public.proforma_invoices for each row execute function public.set_proforma_total();
create trigger proforma_invoice_items_set_total before insert or update on public.proforma_invoice_items for each row execute function public.set_simple_line_total();
create trigger sales_invoices_set_total before insert or update on public.sales_invoices for each row execute function public.set_invoice_total();
create trigger sales_invoice_items_set_total before insert or update on public.sales_invoice_items for each row execute function public.set_simple_line_total();
create trigger reservations_prevent_unavailable before insert on public.reservations for each row execute function public.prevent_unavailable_reservation();
create trigger reservations_after_created after insert on public.reservations for each row execute function public.after_reservation_created();
create trigger payments_after_changed after insert or update on public.payments for each row execute function public.after_payment_changed();

create index quotations_company_branch_status_idx on public.quotations(company_id, branch_id, status) where deleted_at is null;
create index quotations_company_customer_idx on public.quotations(company_id, customer_id) where deleted_at is null;
create index quotation_items_company_quotation_idx on public.quotation_items(company_id, quotation_id);
create index reservations_company_vehicle_idx on public.reservations(company_id, vehicle_id, status) where deleted_at is null;
create index proforma_company_status_idx on public.proforma_invoices(company_id, status) where deleted_at is null;
create index sales_invoices_company_status_idx on public.sales_invoices(company_id, invoice_status) where deleted_at is null;
create index sales_invoices_company_customer_idx on public.sales_invoices(company_id, customer_id) where deleted_at is null;
create index payments_company_invoice_idx on public.payments(company_id, related_invoice_id) where deleted_at is null;
create index payments_company_date_idx on public.payments(company_id, payment_date desc) where deleted_at is null;

grant select, insert, update, delete on public.quotations to authenticated;
grant select, insert, update, delete on public.quotation_items to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;
grant select, insert, update, delete on public.proforma_invoices to authenticated;
grant select, insert, update, delete on public.proforma_invoice_items to authenticated;
grant select, insert, update, delete on public.sales_invoices to authenticated;
grant select, insert, update, delete on public.sales_invoice_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.reservations enable row level security;
alter table public.proforma_invoices enable row level security;
alter table public.proforma_invoice_items enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_items enable row level security;
alter table public.payments enable row level security;

create policy "quotations_select_sales_viewers" on public.quotations
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_sales')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "quotations_insert_creators" on public.quotations
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'create_quotation')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "quotations_update_editors" on public.quotations
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'update_quotation')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'update_quotation')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "quotation_items_select_parent" on public.quotation_items
  for select to authenticated
  using (
    exists (
      select 1 from public.quotations q
      where q.id = quotation_items.quotation_id
        and q.company_id = quotation_items.company_id
        and q.deleted_at is null
        and app_private.has_company_permission(q.company_id, 'view_sales')
        and app_private.can_access_branch(q.company_id, q.branch_id)
    )
  );

create policy "quotation_items_mutate_parent" on public.quotation_items
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'create_quotation'))
  with check (app_private.has_company_permission(company_id, 'create_quotation'));

create policy "reservations_select_sales_viewers" on public.reservations
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_sales')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "reservations_insert_permitted" on public.reservations
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'reserve_vehicle')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "reservations_update_permitted" on public.reservations
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'reserve_vehicle')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'reserve_vehicle')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "proforma_select_sales_viewers" on public.proforma_invoices
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_sales')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "proforma_insert_invoice_creators" on public.proforma_invoices
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'create_invoice')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "proforma_update_invoice_creators" on public.proforma_invoices
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'create_invoice')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'create_invoice')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "proforma_items_select_parent" on public.proforma_invoice_items
  for select to authenticated
  using (
    exists (
      select 1 from public.proforma_invoices p
      where p.id = proforma_invoice_items.proforma_invoice_id
        and p.company_id = proforma_invoice_items.company_id
        and p.deleted_at is null
        and app_private.has_company_permission(p.company_id, 'view_sales')
        and app_private.can_access_branch(p.company_id, p.branch_id)
    )
  );

create policy "proforma_items_mutate_parent" on public.proforma_invoice_items
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'create_invoice'))
  with check (app_private.has_company_permission(company_id, 'create_invoice'));

create policy "sales_invoices_select_sales_viewers" on public.sales_invoices
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_sales') or app_private.has_company_permission(company_id, 'view_payments'))
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "sales_invoices_insert_invoice_creators" on public.sales_invoices
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'create_invoice')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "sales_invoices_update_invoice_creators" on public.sales_invoices
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'create_invoice')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'create_invoice')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "sales_invoice_items_select_parent" on public.sales_invoice_items
  for select to authenticated
  using (
    exists (
      select 1 from public.sales_invoices s
      where s.id = sales_invoice_items.sales_invoice_id
        and s.company_id = sales_invoice_items.company_id
        and s.deleted_at is null
        and (app_private.has_company_permission(s.company_id, 'view_sales') or app_private.has_company_permission(s.company_id, 'view_payments'))
        and app_private.can_access_branch(s.company_id, s.branch_id)
    )
  );

create policy "sales_invoice_items_mutate_parent" on public.sales_invoice_items
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'create_invoice'))
  with check (app_private.has_company_permission(company_id, 'create_invoice'));

create policy "payments_select_payment_viewers" on public.payments
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_payments') or app_private.has_company_permission(company_id, 'record_payment'))
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "payments_insert_payment_recorders" on public.payments
  for insert to authenticated
  with check (
    app_private.has_company_permission(company_id, 'record_payment')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "payments_update_payment_recorders" on public.payments
  for update to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'record_payment')
    and app_private.can_access_branch(company_id, branch_id)
  )
  with check (
    app_private.has_company_permission(company_id, 'record_payment')
    and app_private.can_access_branch(company_id, branch_id)
  );

insert into public.quotations (
  company_id,
  branch_id,
  quotation_number,
  customer_id,
  lead_id,
  vehicle_id,
  price,
  discount,
  tax,
  currency_code,
  valid_until,
  notes,
  status
)
select
  l.company_id,
  l.branch_id,
  'Q-SEED-0001',
  l.customer_id,
  l.id,
  v.id,
  v.selling_price,
  5000,
  0,
  v.currency_code,
  current_date + 10,
  'Seed quotation for export-ready Prado inquiry.',
  'sent'
from public.leads l
join public.vehicles v
  on v.company_id = l.company_id
  and v.brand = 'Toyota'
  and v.model = 'Land Cruiser 300'
where l.name = 'Algeria Auto Dealer'
limit 1;

insert into public.quotation_items (company_id, quotation_id, vehicle_id, description, quantity, unit_price, discount, tax)
select q.company_id, q.id, q.vehicle_id, 'Vehicle sale price', 1, q.price, q.discount, q.tax
from public.quotations q
where q.quotation_number = 'Q-SEED-0001';
