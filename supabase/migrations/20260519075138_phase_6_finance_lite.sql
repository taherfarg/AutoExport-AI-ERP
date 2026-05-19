create type public.finance_expense_category as enum (
  'purchase',
  'shipping',
  'customs',
  'transport',
  'inspection',
  'repair',
  'detailing',
  'marketing',
  'commission',
  'branch_overhead',
  'supplier',
  'other'
);
create type public.finance_record_status as enum ('draft', 'open', 'partial', 'paid', 'overdue', 'cancelled');
create type public.finance_commission_status as enum ('pending', 'approved', 'paid', 'cancelled');
create type public.finance_account_status as enum ('active', 'inactive', 'archived');
create type public.finance_snapshot_period as enum ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

insert into public.permissions (module_key, action_key, permission_key, description) values
('finance', 'manage', 'manage_finance', 'Manage Finance Lite records.'),
('finance', 'manage_commissions', 'manage_commissions', 'Manage salesperson commission records.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin')
  and p.permission_key in ('view_finance', 'manage_finance', 'manage_commissions', 'view_vehicle_profit', 'view_vehicle_cost')
on conflict (role_id, permission_id) do nothing;

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  method_key text not null,
  name text not null,
  payment_method public.payment_method,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, method_key),
  unique (id, company_id)
);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  account_name text not null,
  bank_name text not null,
  iban text,
  account_number text,
  currency_code char(3) not null default 'AED',
  status public.finance_account_status not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  account_name text not null,
  currency_code char(3) not null default 'AED',
  opening_balance numeric(14,2) not null default 0,
  status public.finance_account_status not null default 'active',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete cascade,
  constraint cash_accounts_opening_balance_check check (opening_balance >= 0)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  vehicle_id uuid,
  export_order_id uuid,
  import_order_id uuid,
  category public.finance_expense_category not null default 'other',
  expense_number text not null,
  description text not null,
  amount numeric(14,2) not null,
  currency_code char(3) not null default 'AED',
  expense_date date not null default current_date,
  supplier_name text,
  payment_method_id uuid,
  bank_account_id uuid,
  cash_account_id uuid,
  status public.finance_record_status not null default 'paid',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, expense_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (export_order_id, company_id) references public.export_orders(id, company_id) on delete set null (export_order_id),
  foreign key (import_order_id, company_id) references public.import_orders(id, company_id) on delete set null (import_order_id),
  foreign key (payment_method_id, company_id) references public.payment_methods(id, company_id) on delete set null (payment_method_id),
  foreign key (bank_account_id, company_id) references public.bank_accounts(id, company_id) on delete set null (bank_account_id),
  foreign key (cash_account_id, company_id) references public.cash_accounts(id, company_id) on delete set null (cash_account_id),
  constraint expenses_amount_check check (amount >= 0)
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  customer_id uuid,
  vehicle_id uuid,
  sales_invoice_id uuid,
  receivable_number text not null,
  description text not null,
  amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  due_date date,
  status public.finance_record_status not null default 'open',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, receivable_number),
  unique (company_id, sales_invoice_id),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (sales_invoice_id, company_id) references public.sales_invoices(id, company_id) on delete cascade,
  constraint receivables_amounts_check check (amount >= 0 and paid_amount >= 0 and balance_due >= 0)
);

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  vehicle_id uuid,
  export_order_id uuid,
  import_order_id uuid,
  payable_number text not null,
  supplier_name text not null,
  description text not null,
  amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  due_date date,
  status public.finance_record_status not null default 'open',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, payable_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (export_order_id, company_id) references public.export_orders(id, company_id) on delete set null (export_order_id),
  foreign key (import_order_id, company_id) references public.import_orders(id, company_id) on delete set null (import_order_id),
  constraint payables_amounts_check check (amount >= 0 and paid_amount >= 0 and balance_due >= 0)
);

create table public.vehicle_profit_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  vehicle_id uuid not null,
  sales_invoice_id uuid,
  snapshot_date date not null default current_date,
  currency_code char(3) not null default 'AED',
  selling_price numeric(14,2) not null default 0,
  total_landed_cost numeric(14,2) not null default 0,
  finance_expenses numeric(14,2) not null default 0,
  shipment_costs numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  net_profit numeric(14,2) not null default 0,
  profit_margin numeric(8,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, vehicle_id, snapshot_date),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete cascade,
  foreign key (sales_invoice_id, company_id) references public.sales_invoices(id, company_id) on delete set null (sales_invoice_id),
  constraint vehicle_profit_snapshot_amounts_check check (
    selling_price >= 0 and total_landed_cost >= 0 and finance_expenses >= 0 and shipment_costs >= 0 and commission_amount >= 0
  )
);

create table public.branch_profit_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  period_type public.finance_snapshot_period not null default 'monthly',
  period_start date not null,
  period_end date not null,
  currency_code char(3) not null default 'AED',
  sales_total numeric(14,2) not null default 0,
  paid_total numeric(14,2) not null default 0,
  receivables_total numeric(14,2) not null default 0,
  expenses_total numeric(14,2) not null default 0,
  payables_total numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  net_profit numeric(14,2) not null default 0,
  vehicles_sold integer not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, branch_id, period_type, period_start),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete cascade,
  constraint branch_profit_period_check check (period_end >= period_start)
);

create table public.salesperson_commissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  salesperson_id uuid references public.profiles(id),
  sales_invoice_id uuid,
  vehicle_id uuid,
  commission_number text not null,
  basis_amount numeric(14,2) not null default 0,
  commission_rate numeric(8,4) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  status public.finance_commission_status not null default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, commission_number),
  unique (company_id, sales_invoice_id, salesperson_id),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (sales_invoice_id, company_id) references public.sales_invoices(id, company_id) on delete set null (sales_invoice_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  constraint commissions_amounts_check check (basis_amount >= 0 and commission_rate >= 0 and commission_amount >= 0)
);

create or replace function public.calculate_finance_balance_status(amount numeric, paid numeric, due_date date)
returns public.finance_record_status
language sql
stable
as $$
  select case
    when coalesce(amount, 0) <= 0 then 'paid'::public.finance_record_status
    when coalesce(paid, 0) <= 0 and due_date is not null and due_date < current_date then 'overdue'::public.finance_record_status
    when greatest(round(coalesce(amount, 0) - coalesce(paid, 0), 2), 0) <= 0 then 'paid'::public.finance_record_status
    when coalesce(paid, 0) > 0 then 'partial'::public.finance_record_status
    else 'open'::public.finance_record_status
  end
$$;

create or replace function public.set_finance_balance_fields()
returns trigger
language plpgsql
as $$
begin
  new.balance_due := greatest(round(coalesce(new.amount, 0) - coalesce(new.paid_amount, 0), 2), 0);
  if new.status <> 'cancelled' then
    new.status := public.calculate_finance_balance_status(new.amount, new.paid_amount, new.due_date);
  end if;
  return new;
end;
$$;

create or replace function public.set_commission_amount()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.commission_amount, 0) = 0 and coalesce(new.basis_amount, 0) > 0 and coalesce(new.commission_rate, 0) > 0 then
    new.commission_amount := round(new.basis_amount * (new.commission_rate / 100), 2);
  end if;
  return new;
end;
$$;

create or replace function app_private.sync_receivable_from_invoice()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.deleted_at is not null or new.invoice_status = 'cancelled' then
    update public.receivables
    set status = 'cancelled',
        updated_by = new.updated_by
    where sales_invoice_id = new.id
      and company_id = new.company_id;
    return new;
  end if;

  insert into public.receivables (
    company_id,
    branch_id,
    customer_id,
    vehicle_id,
    sales_invoice_id,
    receivable_number,
    description,
    amount,
    paid_amount,
    balance_due,
    currency_code,
    due_date,
    status,
    created_by,
    updated_by
  )
  values (
    new.company_id,
    new.branch_id,
    new.customer_id,
    new.vehicle_id,
    new.id,
    'AR-' || new.invoice_number,
    'Receivable for invoice ' || new.invoice_number,
    new.total,
    new.paid_amount,
    new.balance_due,
    new.currency_code,
    new.due_date,
    public.calculate_finance_balance_status(new.total, new.paid_amount, new.due_date),
    new.created_by,
    new.updated_by
  )
  on conflict (company_id, sales_invoice_id) do update
  set amount = excluded.amount,
      paid_amount = excluded.paid_amount,
      balance_due = excluded.balance_due,
      currency_code = excluded.currency_code,
      due_date = excluded.due_date,
      status = excluded.status,
      updated_by = excluded.updated_by,
      updated_at = now();

  return new;
end;
$$;

create trigger payment_methods_set_updated_at before update on public.payment_methods for each row execute function public.set_updated_at();
create trigger bank_accounts_set_updated_at before update on public.bank_accounts for each row execute function public.set_updated_at();
create trigger cash_accounts_set_updated_at before update on public.cash_accounts for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
create trigger receivables_set_updated_at before update on public.receivables for each row execute function public.set_updated_at();
create trigger payables_set_updated_at before update on public.payables for each row execute function public.set_updated_at();
create trigger vehicle_profit_snapshots_set_updated_at before update on public.vehicle_profit_snapshots for each row execute function public.set_updated_at();
create trigger branch_profit_snapshots_set_updated_at before update on public.branch_profit_snapshots for each row execute function public.set_updated_at();
create trigger salesperson_commissions_set_updated_at before update on public.salesperson_commissions for each row execute function public.set_updated_at();
create trigger receivables_set_balance before insert or update on public.receivables for each row execute function public.set_finance_balance_fields();
create trigger payables_set_balance before insert or update on public.payables for each row execute function public.set_finance_balance_fields();
create trigger salesperson_commissions_set_amount before insert or update on public.salesperson_commissions for each row execute function public.set_commission_amount();
create trigger sales_invoices_sync_receivable after insert or update on public.sales_invoices for each row execute function app_private.sync_receivable_from_invoice();

create index payment_methods_company_idx on public.payment_methods(company_id) where deleted_at is null;
create index bank_accounts_company_branch_idx on public.bank_accounts(company_id, branch_id) where deleted_at is null;
create index cash_accounts_company_branch_idx on public.cash_accounts(company_id, branch_id) where deleted_at is null;
create index expenses_company_branch_date_idx on public.expenses(company_id, branch_id, expense_date desc) where deleted_at is null;
create index expenses_company_vehicle_idx on public.expenses(company_id, vehicle_id) where deleted_at is null;
create index receivables_company_status_idx on public.receivables(company_id, status) where deleted_at is null;
create index payables_company_status_idx on public.payables(company_id, status) where deleted_at is null;
create index vehicle_profit_company_vehicle_idx on public.vehicle_profit_snapshots(company_id, vehicle_id, snapshot_date desc);
create index branch_profit_company_branch_idx on public.branch_profit_snapshots(company_id, branch_id, period_start desc);
create index commissions_company_salesperson_idx on public.salesperson_commissions(company_id, salesperson_id, status) where deleted_at is null;

grant select, insert, update, delete on public.payment_methods to authenticated;
grant select, insert, update, delete on public.bank_accounts to authenticated;
grant select, insert, update, delete on public.cash_accounts to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.receivables to authenticated;
grant select, insert, update, delete on public.payables to authenticated;
grant select, insert, update, delete on public.vehicle_profit_snapshots to authenticated;
grant select, insert, update, delete on public.branch_profit_snapshots to authenticated;
grant select, insert, update, delete on public.salesperson_commissions to authenticated;

alter table public.payment_methods enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.expenses enable row level security;
alter table public.receivables enable row level security;
alter table public.payables enable row level security;
alter table public.vehicle_profit_snapshots enable row level security;
alter table public.branch_profit_snapshots enable row level security;
alter table public.salesperson_commissions enable row level security;

create policy "payment_methods_select_finance" on public.payment_methods
  for select to authenticated
  using (deleted_at is null and app_private.has_company_permission(company_id, 'view_finance'));

create policy "payment_methods_manage_finance" on public.payment_methods
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "bank_accounts_select_finance" on public.bank_accounts
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "bank_accounts_manage_finance" on public.bank_accounts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "cash_accounts_select_finance" on public.cash_accounts
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "cash_accounts_manage_finance" on public.cash_accounts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "expenses_select_finance" on public.expenses
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "expenses_manage_finance" on public.expenses
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "expenses_insert_finance" on public.expenses
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "receivables_select_finance" on public.receivables
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "receivables_manage_finance" on public.receivables
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "receivables_insert_finance" on public.receivables
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "payables_select_finance" on public.payables
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "payables_manage_finance" on public.payables
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "payables_insert_finance" on public.payables
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "vehicle_profit_snapshots_select_finance" on public.vehicle_profit_snapshots
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "vehicle_profit_snapshots_manage_finance" on public.vehicle_profit_snapshots
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "vehicle_profit_snapshots_insert_finance" on public.vehicle_profit_snapshots
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "branch_profit_snapshots_select_finance" on public.branch_profit_snapshots
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "branch_profit_snapshots_manage_finance" on public.branch_profit_snapshots
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'manage_finance'))
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "branch_profit_snapshots_insert_finance" on public.branch_profit_snapshots
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_finance'));

create policy "salesperson_commissions_select_finance" on public.salesperson_commissions
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_finance')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "salesperson_commissions_manage" on public.salesperson_commissions
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'manage_commissions'))
  with check (app_private.has_company_permission(company_id, 'manage_commissions'));

create policy "salesperson_commissions_insert_manage" on public.salesperson_commissions
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_commissions'));

insert into public.payment_methods (company_id, method_key, name, payment_method)
select c.id, methods.method_key, methods.name, methods.payment_method::public.payment_method
from public.companies c
cross join (values
  ('cash', 'Cash', 'cash'),
  ('bank_transfer', 'Bank transfer', 'bank_transfer'),
  ('card', 'Card', 'card')
) as methods(method_key, name, payment_method)
on conflict (company_id, method_key) do nothing;

insert into public.cash_accounts (company_id, branch_id, account_name, currency_code)
select b.company_id, b.id, b.name || ' Cash', b.currency_code
from public.branches b
where b.deleted_at is null;

insert into public.bank_accounts (company_id, branch_id, account_name, bank_name, currency_code)
select b.company_id, b.id, b.name || ' Operating Account', 'Primary Bank', b.currency_code
from public.branches b
where b.deleted_at is null;

insert into public.expenses (
  company_id,
  branch_id,
  vehicle_id,
  category,
  expense_number,
  description,
  amount,
  currency_code,
  supplier_name,
  status
)
select v.company_id, v.branch_id, v.id, 'detailing'::public.finance_expense_category, 'EXP-SEED-' || v.stock_number, 'Seed detailing and preparation expense', 1500, v.currency_code, 'Detailing Partner', 'paid'::public.finance_record_status
from public.vehicles v
where v.stock_number in ('PM-DXB-0001', 'GAE-UAE-0001', 'EMT-DXB-0001', 'SAH-DZ-0001')
on conflict (company_id, expense_number) do nothing;

insert into public.payables (
  company_id,
  branch_id,
  vehicle_id,
  payable_number,
  supplier_name,
  description,
  amount,
  paid_amount,
  currency_code,
  due_date
)
select v.company_id, v.branch_id, v.id, 'AP-SEED-' || v.stock_number, 'Logistics Partner', 'Seed supplier payable for vehicle handling', 3200, 0, v.currency_code, current_date + 15
from public.vehicles v
where v.stock_number in ('PM-DXB-0001', 'GAE-UAE-0001', 'EMT-DXB-0001', 'SAH-DZ-0001')
on conflict (company_id, payable_number) do nothing;
