create type public.gl_account_type as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
create type public.gl_account_status as enum ('active', 'inactive', 'archived');
create type public.journal_entry_status as enum ('draft', 'posted', 'reversed', 'void');
create type public.journal_source_type as enum ('manual', 'sales_invoice', 'payment', 'expense', 'payable', 'commission', 'import_export');
create type public.accounting_period_status as enum ('open', 'locked', 'closed');
create type public.bank_transaction_type as enum ('deposit', 'withdrawal', 'fee', 'transfer', 'adjustment');
create type public.bank_reconciliation_status as enum ('draft', 'matched', 'approved', 'cancelled');
create type public.accounting_export_format as enum ('csv', 'quickbooks', 'xero', 'zoho', 'datev');
create type public.accounting_export_status as enum ('queued', 'generated', 'failed');
create type public.tax_report_status as enum ('draft', 'generated', 'filed', 'cancelled');

insert into public.modules (module_key, name, description, sort_order, is_core) values
('accounting', 'Full Accounting', 'General ledger, journals, tax reports, bank reconciliation, and accounting exports.', 82, false)
on conflict (module_key) do nothing;

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key = 'accounting'
where p.package_key in ('enterprise_dealer_group')
on conflict (package_id, module_id) do update set enabled = excluded.enabled;

insert into public.permissions (module_key, action_key, permission_key, description) values
('finance', 'view_accounting', 'view_accounting', 'View general ledger, tax, bank reconciliation, and accounting export records.'),
('finance', 'manage_accounting', 'manage_accounting', 'Create and manage accounting records.'),
('finance', 'export_accounting', 'export_accounting', 'Generate accounting exports for external accounting systems.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager', 'accountant')
  and p.permission_key in ('view_accounting', 'manage_accounting', 'export_accounting')
on conflict (role_id, permission_id) do nothing;

create table public.gl_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_account_id uuid,
  account_code text not null,
  account_name text not null,
  account_type public.gl_account_type not null,
  status public.gl_account_status not null default 'active',
  normal_balance text not null,
  currency_code char(3) not null default 'AED',
  description text,
  system_key text,
  is_system_account boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, account_code),
  unique (id, company_id),
  foreign key (parent_account_id, company_id) references public.gl_accounts(id, company_id) on delete set null (parent_account_id),
  constraint gl_accounts_normal_balance_check check (normal_balance in ('debit', 'credit'))
);

create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_name text not null,
  period_start date not null,
  period_end date not null,
  status public.accounting_period_status not null default 'open',
  locked_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, period_name),
  unique (id, company_id),
  constraint accounting_periods_dates_check check (period_end >= period_start)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  period_id uuid,
  entry_number text not null,
  entry_date date not null default current_date,
  source_type public.journal_source_type not null default 'manual',
  source_record_id uuid,
  memo text not null,
  status public.journal_entry_status not null default 'draft',
  currency_code char(3) not null default 'AED',
  posted_at timestamptz,
  posted_by uuid references public.profiles(id),
  reversed_entry_id uuid,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, entry_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (period_id, company_id) references public.accounting_periods(id, company_id) on delete set null (period_id),
  foreign key (reversed_entry_id, company_id) references public.journal_entries(id, company_id) on delete set null (reversed_entry_id)
);

create table public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  journal_entry_id uuid not null,
  gl_account_id uuid not null,
  branch_id uuid,
  vehicle_id uuid,
  customer_id uuid,
  description text,
  debit_amount numeric(14,2) not null default 0,
  credit_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  line_order integer not null default 1,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (journal_entry_id, company_id) references public.journal_entries(id, company_id) on delete cascade,
  foreign key (gl_account_id, company_id) references public.gl_accounts(id, company_id) on delete restrict,
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  constraint journal_entry_lines_amounts_check check (
    debit_amount >= 0 and credit_amount >= 0 and not (debit_amount > 0 and credit_amount > 0)
  )
);

create table public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  country_code char(2) not null default 'AE',
  tax_name text not null,
  rate_percent numeric(7,4) not null default 0,
  tax_account_id uuid,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, country_code, tax_name),
  unique (id, company_id),
  foreign key (tax_account_id, company_id) references public.gl_accounts(id, company_id) on delete set null (tax_account_id),
  constraint tax_rates_percent_check check (rate_percent >= 0 and rate_percent <= 100)
);

create table public.tax_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  report_number text not null,
  country_code char(2) not null default 'AE',
  period_start date not null,
  period_end date not null,
  taxable_sales numeric(14,2) not null default 0,
  taxable_purchases numeric(14,2) not null default 0,
  tax_collected numeric(14,2) not null default 0,
  tax_paid numeric(14,2) not null default 0,
  net_tax_due numeric(14,2) not null default 0,
  status public.tax_report_status not null default 'generated',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, report_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  constraint tax_reports_dates_check check (period_end >= period_start),
  constraint tax_reports_amounts_check check (taxable_sales >= 0 and taxable_purchases >= 0 and tax_collected >= 0 and tax_paid >= 0)
);

create table public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  bank_account_id uuid,
  matched_journal_entry_id uuid,
  transaction_number text not null,
  transaction_date date not null default current_date,
  transaction_type public.bank_transaction_type not null,
  amount numeric(14,2) not null,
  currency_code char(3) not null default 'AED',
  description text not null,
  reference text,
  status public.finance_record_status not null default 'open',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, transaction_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (bank_account_id, company_id) references public.bank_accounts(id, company_id) on delete set null (bank_account_id),
  foreign key (matched_journal_entry_id, company_id) references public.journal_entries(id, company_id) on delete set null (matched_journal_entry_id),
  constraint bank_transactions_amount_check check (amount > 0)
);

create table public.bank_reconciliations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bank_account_id uuid,
  reconciliation_number text not null,
  statement_start_date date not null,
  statement_end_date date not null,
  statement_ending_balance numeric(14,2) not null default 0,
  system_ending_balance numeric(14,2) not null default 0,
  difference_amount numeric(14,2) not null default 0,
  status public.bank_reconciliation_status not null default 'draft',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, reconciliation_number),
  unique (id, company_id),
  foreign key (bank_account_id, company_id) references public.bank_accounts(id, company_id) on delete set null (bank_account_id),
  constraint bank_reconciliations_dates_check check (statement_end_date >= statement_start_date)
);

create table public.accounting_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  export_number text not null,
  export_format public.accounting_export_format not null default 'csv',
  period_start date not null,
  period_end date not null,
  status public.accounting_export_status not null default 'queued',
  file_path text,
  summary_payload jsonb not null default '{}'::jsonb,
  requested_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, export_number),
  unique (id, company_id),
  constraint accounting_exports_dates_check check (period_end >= period_start)
);

create or replace function app_private.seed_default_gl_accounts(target_company_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  company_currency char(3);
begin
  select primary_currency_code into company_currency
  from public.companies
  where id = target_company_id;

  if company_currency is null then
    company_currency := 'AED';
  end if;

  insert into public.gl_accounts (company_id, account_code, account_name, account_type, normal_balance, currency_code, system_key, is_system_account)
  values
    (target_company_id, '1000', 'Cash on Hand', 'asset', 'debit', company_currency, 'cash_on_hand', true),
    (target_company_id, '1010', 'Bank Account', 'asset', 'debit', company_currency, 'bank_account', true),
    (target_company_id, '1100', 'Accounts Receivable', 'asset', 'debit', company_currency, 'accounts_receivable', true),
    (target_company_id, '1200', 'Vehicle Inventory', 'asset', 'debit', company_currency, 'vehicle_inventory', true),
    (target_company_id, '2000', 'Accounts Payable', 'liability', 'credit', company_currency, 'accounts_payable', true),
    (target_company_id, '2100', 'VAT Payable', 'liability', 'credit', company_currency, 'vat_payable', true),
    (target_company_id, '3000', 'Owner Equity', 'equity', 'credit', company_currency, 'owner_equity', true),
    (target_company_id, '4000', 'Vehicle Sales Revenue', 'revenue', 'credit', company_currency, 'vehicle_sales_revenue', true),
    (target_company_id, '5000', 'Cost of Vehicles Sold', 'expense', 'debit', company_currency, 'cost_of_vehicles_sold', true),
    (target_company_id, '5100', 'Vehicle Operating Expenses', 'expense', 'debit', company_currency, 'vehicle_operating_expenses', true),
    (target_company_id, '5200', 'Bank Fees', 'expense', 'debit', company_currency, 'bank_fees', true),
    (target_company_id, '5300', 'Sales Commissions', 'expense', 'debit', company_currency, 'sales_commissions', true)
  on conflict (company_id, account_code) do nothing;
end;
$$;

create or replace function app_private.seed_default_gl_accounts_for_company()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform app_private.seed_default_gl_accounts(new.id);
  return new;
end;
$$;

create or replace function app_private.ensure_journal_entry_balanced()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  debit_total numeric(14,2);
  credit_total numeric(14,2);
begin
  if new.status = 'posted'::public.journal_entry_status and old.status is distinct from new.status then
    select coalesce(round(sum(debit_amount), 2), 0), coalesce(round(sum(credit_amount), 2), 0)
    into debit_total, credit_total
    from public.journal_entry_lines
    where journal_entry_id = new.id
      and company_id = new.company_id
      and deleted_at is null;

    if debit_total <= 0 or credit_total <= 0 or debit_total <> credit_total then
      raise exception 'Journal entry must be balanced before posting';
    end if;

    new.posted_at := coalesce(new.posted_at, now());
  end if;

  return new;
end;
$$;

create trigger companies_seed_default_gl_accounts
after insert on public.companies
for each row execute function app_private.seed_default_gl_accounts_for_company();

create trigger gl_accounts_set_updated_at before update on public.gl_accounts for each row execute function public.set_updated_at();
create trigger accounting_periods_set_updated_at before update on public.accounting_periods for each row execute function public.set_updated_at();
create trigger journal_entries_set_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();
create trigger tax_rates_set_updated_at before update on public.tax_rates for each row execute function public.set_updated_at();
create trigger tax_reports_set_updated_at before update on public.tax_reports for each row execute function public.set_updated_at();
create trigger bank_transactions_set_updated_at before update on public.bank_transactions for each row execute function public.set_updated_at();
create trigger bank_reconciliations_set_updated_at before update on public.bank_reconciliations for each row execute function public.set_updated_at();
create trigger accounting_exports_set_updated_at before update on public.accounting_exports for each row execute function public.set_updated_at();
create trigger journal_entries_validate_before_post before update on public.journal_entries for each row execute function app_private.ensure_journal_entry_balanced();

create index gl_accounts_company_type_idx on public.gl_accounts(company_id, account_type, account_code) where deleted_at is null;
create index accounting_periods_company_dates_idx on public.accounting_periods(company_id, period_start, period_end) where deleted_at is null;
create index journal_entries_company_date_idx on public.journal_entries(company_id, entry_date desc, status) where deleted_at is null;
create index journal_entries_company_branch_idx on public.journal_entries(company_id, branch_id, entry_date desc) where deleted_at is null;
create index journal_lines_company_entry_idx on public.journal_entry_lines(company_id, journal_entry_id) where deleted_at is null;
create index journal_lines_company_account_idx on public.journal_entry_lines(company_id, gl_account_id) where deleted_at is null;
create index tax_rates_company_country_idx on public.tax_rates(company_id, country_code, is_active) where deleted_at is null;
create index tax_reports_company_period_idx on public.tax_reports(company_id, period_start, period_end, status) where deleted_at is null;
create index bank_transactions_company_date_idx on public.bank_transactions(company_id, transaction_date desc, status) where deleted_at is null;
create index bank_reconciliations_company_date_idx on public.bank_reconciliations(company_id, statement_end_date desc, status) where deleted_at is null;
create index accounting_exports_company_period_idx on public.accounting_exports(company_id, period_start, period_end, status) where deleted_at is null;

grant select, insert, update, delete on public.gl_accounts to authenticated;
grant select, insert, update, delete on public.accounting_periods to authenticated;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.journal_entry_lines to authenticated;
grant select, insert, update, delete on public.tax_rates to authenticated;
grant select, insert, update, delete on public.tax_reports to authenticated;
grant select, insert, update, delete on public.bank_transactions to authenticated;
grant select, insert, update, delete on public.bank_reconciliations to authenticated;
grant select, insert, update, delete on public.accounting_exports to authenticated;

alter table public.gl_accounts enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;
alter table public.tax_rates enable row level security;
alter table public.tax_reports enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.bank_reconciliations enable row level security;
alter table public.accounting_exports enable row level security;

create policy "gl_accounts_select_accounting" on public.gl_accounts
  for select to authenticated
  using (
    deleted_at is null
    and (
      app_private.has_company_permission(company_id, 'view_accounting')
      or app_private.has_company_permission(company_id, 'manage_accounting')
      or app_private.has_company_permission(company_id, 'export_accounting')
      or app_private.has_company_permission(company_id, 'view_finance')
    )
  );
create policy "gl_accounts_manage_accounting" on public.gl_accounts
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting'));

create policy "accounting_periods_select_accounting" on public.accounting_periods
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting') or app_private.has_company_permission(company_id, 'view_finance')));
create policy "accounting_periods_manage_accounting" on public.accounting_periods
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting'));

create policy "journal_entries_select_accounting" on public.journal_entries
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting') or app_private.has_company_permission(company_id, 'view_finance'))
    and app_private.can_access_branch(company_id, branch_id)
  );
create policy "journal_entries_manage_accounting" on public.journal_entries
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting') and app_private.can_access_branch(company_id, branch_id));

create policy "journal_lines_select_accounting" on public.journal_entry_lines
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting') or app_private.has_company_permission(company_id, 'view_finance'))
    and app_private.can_access_branch(company_id, branch_id)
  );
create policy "journal_lines_manage_accounting" on public.journal_entry_lines
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting') and app_private.can_access_branch(company_id, branch_id));

create policy "tax_rates_select_accounting" on public.tax_rates
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'view_finance')));
create policy "tax_rates_manage_accounting" on public.tax_rates
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting'));

create policy "tax_reports_select_accounting" on public.tax_reports
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting') or app_private.has_company_permission(company_id, 'view_finance'))
    and app_private.can_access_branch(company_id, branch_id)
  );
create policy "tax_reports_manage_accounting" on public.tax_reports
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting') and app_private.can_access_branch(company_id, branch_id));

create policy "bank_transactions_select_accounting" on public.bank_transactions
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'view_finance'))
    and app_private.can_access_branch(company_id, branch_id)
  );
create policy "bank_transactions_manage_accounting" on public.bank_transactions
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting') and app_private.can_access_branch(company_id, branch_id));

create policy "bank_reconciliations_select_accounting" on public.bank_reconciliations
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'view_finance')));
create policy "bank_reconciliations_manage_accounting" on public.bank_reconciliations
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting'));

create policy "accounting_exports_select_accounting" on public.accounting_exports
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_accounting') or app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting') or app_private.has_company_permission(company_id, 'view_finance')));
create policy "accounting_exports_manage_accounting" on public.accounting_exports
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting'));
create policy "accounting_exports_update_accounting" on public.accounting_exports
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting'))
  with check (app_private.has_company_permission(company_id, 'manage_accounting') or app_private.has_company_permission(company_id, 'export_accounting'));

select app_private.seed_default_gl_accounts(c.id)
from public.companies c;

insert into public.tax_rates (company_id, country_code, tax_name, rate_percent, tax_account_id, is_active)
select c.id, c.primary_country_code, 'Standard VAT', case when c.primary_country_code in ('AE', 'SA', 'BH', 'OM') then 5 else 0 end,
       a.id, true
from public.companies c
left join public.gl_accounts a on a.company_id = c.id and a.system_key = 'vat_payable'
on conflict (company_id, country_code, tax_name) do nothing;
