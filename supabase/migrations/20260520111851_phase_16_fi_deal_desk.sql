create type public.deal_type as enum ('cash', 'finance', 'lease');
create type public.deal_status as enum ('draft', 'submitted', 'approved', 'rejected', 'contracted', 'funded', 'cancelled');
create type public.fi_product_status as enum ('quoted', 'accepted', 'declined', 'cancelled');
create type public.finance_application_status as enum ('draft', 'submitted', 'conditionally_approved', 'approved', 'declined', 'funded', 'cancelled');
create type public.lender_submission_status as enum ('queued', 'sent', 'acknowledged', 'approved', 'declined', 'error');
create type public.deal_approval_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.lender_type as enum ('bank', 'finance_company', 'in_house', 'broker');

insert into public.modules (module_key, name, description, sort_order, is_core) values
('deal_desk', 'Deal Desk', 'Structure F&I deals, lender submissions, products, and approvals.', 55, false)
on conflict (module_key) do nothing;

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key = 'deal_desk'
where p.package_key in ('showroom_pro', 'export_business', 'enterprise_dealer_group')
on conflict (package_id, module_id) do update set enabled = excluded.enabled;

insert into public.permissions (module_key, action_key, permission_key, description) values
('sales', 'view_deals', 'view_deals', 'View F&I deal desk records.'),
('sales', 'manage_deals', 'manage_deals', 'Create and manage F&I deal desk records.'),
('sales', 'approve_deals', 'approve_deals', 'Approve or reject F&I deal structures.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager', 'sales_manager')
  and p.permission_key in ('view_deals', 'manage_deals', 'approve_deals')
on conflict (role_id, permission_id) do nothing;

create table public.lenders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  name text not null,
  lender_type public.lender_type not null default 'bank',
  country_code char(2) not null default 'AE',
  contact_name text,
  contact_email text,
  contact_phone text,
  min_amount numeric(14,2) not null default 0,
  max_amount numeric(14,2),
  base_rate numeric(6,3) not null default 0,
  integration_status text not null default 'manual',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  constraint lenders_amounts_check check (min_amount >= 0 and (max_amount is null or max_amount >= min_amount) and base_rate >= 0)
);

create table public.insurance_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  provider_name text not null,
  product_type text not null default 'insurance',
  premium_amount numeric(14,2) not null default 0,
  cost_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  constraint insurance_products_amounts_check check (premium_amount >= 0 and cost_amount >= 0 and commission_amount >= 0)
);

create table public.warranty_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  provider_name text not null,
  coverage_months integer not null default 12,
  coverage_km integer,
  retail_amount numeric(14,2) not null default 0,
  cost_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  constraint warranty_products_amounts_check check (
    coverage_months > 0 and (coverage_km is null or coverage_km > 0) and retail_amount >= 0 and cost_amount >= 0 and commission_amount >= 0
  )
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  deal_number text not null,
  quotation_id uuid,
  reservation_id uuid,
  sales_invoice_id uuid,
  customer_id uuid,
  lead_id uuid,
  vehicle_id uuid not null,
  deal_type public.deal_type not null default 'finance',
  status public.deal_status not null default 'draft',
  vehicle_price numeric(14,2) not null default 0,
  product_total numeric(14,2) not null default 0,
  down_payment numeric(14,2) not null default 0,
  trade_in_value numeric(14,2) not null default 0,
  finance_amount numeric(14,2) not null default 0,
  term_months integer not null default 60,
  annual_interest_rate numeric(6,3) not null default 0,
  monthly_payment numeric(14,2) not null default 0,
  balloon_payment numeric(14,2) not null default 0,
  total_payable numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  approval_status public.deal_approval_status not null default 'pending',
  notes text,
  salesperson_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, deal_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (quotation_id, company_id) references public.quotations(id, company_id) on delete set null (quotation_id),
  foreign key (reservation_id, company_id) references public.reservations(id, company_id) on delete set null (reservation_id),
  foreign key (sales_invoice_id, company_id) references public.sales_invoices(id, company_id) on delete set null (sales_invoice_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  foreign key (lead_id, company_id) references public.leads(id, company_id) on delete set null (lead_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete restrict,
  constraint deals_amounts_check check (
    vehicle_price >= 0 and product_total >= 0 and down_payment >= 0 and trade_in_value >= 0 and finance_amount >= 0
    and term_months > 0 and annual_interest_rate >= 0 and monthly_payment >= 0 and balloon_payment >= 0 and total_payable >= 0
  )
);

create table public.deal_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  deal_id uuid not null,
  insurance_product_id uuid,
  warranty_product_id uuid,
  product_type text not null,
  name text not null,
  selling_price numeric(14,2) not null default 0,
  cost_amount numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  taxable boolean not null default false,
  status public.fi_product_status not null default 'quoted',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (deal_id, company_id) references public.deals(id, company_id) on delete cascade,
  foreign key (insurance_product_id, company_id) references public.insurance_products(id, company_id) on delete set null (insurance_product_id),
  foreign key (warranty_product_id, company_id) references public.warranty_products(id, company_id) on delete set null (warranty_product_id),
  constraint deal_products_amounts_check check (selling_price >= 0 and cost_amount >= 0 and gross_profit >= 0)
);

create table public.finance_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  deal_id uuid not null,
  lender_id uuid,
  application_number text not null,
  applicant_name text not null,
  applicant_email text,
  applicant_phone text,
  employment_status text,
  annual_income numeric(14,2),
  requested_amount numeric(14,2) not null default 0,
  down_payment numeric(14,2) not null default 0,
  term_months integer not null default 60,
  annual_interest_rate numeric(6,3) not null default 0,
  status public.finance_application_status not null default 'draft',
  risk_score integer,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, application_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (deal_id, company_id) references public.deals(id, company_id) on delete cascade,
  foreign key (lender_id, company_id) references public.lenders(id, company_id) on delete set null (lender_id),
  constraint finance_applications_amounts_check check (
    requested_amount >= 0 and down_payment >= 0 and term_months > 0 and annual_interest_rate >= 0
    and (annual_income is null or annual_income >= 0) and (risk_score is null or risk_score between 0 and 100)
  )
);

create table public.lender_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  finance_application_id uuid not null,
  lender_id uuid not null,
  submission_number text not null,
  status public.lender_submission_status not null default 'queued',
  external_reference text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  decided_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, submission_number),
  unique (id, company_id),
  foreign key (finance_application_id, company_id) references public.finance_applications(id, company_id) on delete cascade,
  foreign key (lender_id, company_id) references public.lenders(id, company_id) on delete restrict
);

create table public.deal_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  deal_id uuid not null,
  approval_number text not null,
  approval_type text not null default 'manager',
  status public.deal_approval_status not null default 'pending',
  requested_by uuid references public.profiles(id),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, approval_number),
  unique (id, company_id),
  foreign key (deal_id, company_id) references public.deals(id, company_id) on delete cascade
);

create trigger lenders_set_updated_at before update on public.lenders for each row execute function public.set_updated_at();
create trigger insurance_products_set_updated_at before update on public.insurance_products for each row execute function public.set_updated_at();
create trigger warranty_products_set_updated_at before update on public.warranty_products for each row execute function public.set_updated_at();
create trigger deals_set_updated_at before update on public.deals for each row execute function public.set_updated_at();
create trigger finance_applications_set_updated_at before update on public.finance_applications for each row execute function public.set_updated_at();
create trigger lender_submissions_set_updated_at before update on public.lender_submissions for each row execute function public.set_updated_at();
create trigger deal_approvals_set_updated_at before update on public.deal_approvals for each row execute function public.set_updated_at();

create index lenders_company_idx on public.lenders(company_id, is_active) where deleted_at is null;
create index insurance_products_company_idx on public.insurance_products(company_id, is_active) where deleted_at is null;
create index warranty_products_company_idx on public.warranty_products(company_id, is_active) where deleted_at is null;
create index deals_company_status_idx on public.deals(company_id, status, created_at desc) where deleted_at is null;
create index deals_company_vehicle_idx on public.deals(company_id, vehicle_id) where deleted_at is null;
create index deal_products_company_deal_idx on public.deal_products(company_id, deal_id) where deleted_at is null;
create index finance_applications_company_deal_idx on public.finance_applications(company_id, deal_id) where deleted_at is null;
create index lender_submissions_company_application_idx on public.lender_submissions(company_id, finance_application_id) where deleted_at is null;
create index deal_approvals_company_deal_idx on public.deal_approvals(company_id, deal_id) where deleted_at is null;

grant select, insert, update, delete on public.lenders to authenticated;
grant select, insert, update, delete on public.insurance_products to authenticated;
grant select, insert, update, delete on public.warranty_products to authenticated;
grant select, insert, update, delete on public.deals to authenticated;
grant select, insert, update, delete on public.deal_products to authenticated;
grant select, insert, update, delete on public.finance_applications to authenticated;
grant select, insert, update, delete on public.lender_submissions to authenticated;
grant select, insert, update, delete on public.deal_approvals to authenticated;

alter table public.lenders enable row level security;
alter table public.insurance_products enable row level security;
alter table public.warranty_products enable row level security;
alter table public.deals enable row level security;
alter table public.deal_products enable row level security;
alter table public.finance_applications enable row level security;
alter table public.lender_submissions enable row level security;
alter table public.deal_approvals enable row level security;

create policy "lenders_select_deal_viewers" on public.lenders
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals')));
create policy "lenders_manage_deals" on public.lenders
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_deals'))
  with check (app_private.has_company_permission(company_id, 'manage_deals') and app_private.can_access_branch(company_id, branch_id));

create policy "insurance_products_select_deal_viewers" on public.insurance_products
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals')));
create policy "insurance_products_manage_deals" on public.insurance_products
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_deals'))
  with check (app_private.has_company_permission(company_id, 'manage_deals'));

create policy "warranty_products_select_deal_viewers" on public.warranty_products
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals')));
create policy "warranty_products_manage_deals" on public.warranty_products
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_deals'))
  with check (app_private.has_company_permission(company_id, 'manage_deals'));

create policy "deals_select_deal_viewers" on public.deals
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals'))
    and app_private.can_access_branch(company_id, branch_id)
  );
create policy "deals_manage_deals" on public.deals
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_deals'))
  with check (app_private.has_company_permission(company_id, 'manage_deals') and app_private.can_access_branch(company_id, branch_id));

create policy "deal_products_select_deal_viewers" on public.deal_products
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals')));
create policy "deal_products_manage_deals" on public.deal_products
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_deals'))
  with check (app_private.has_company_permission(company_id, 'manage_deals'));

create policy "finance_applications_select_deal_viewers" on public.finance_applications
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals'))
    and app_private.can_access_branch(company_id, branch_id)
  );
create policy "finance_applications_manage_deals" on public.finance_applications
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_deals'))
  with check (app_private.has_company_permission(company_id, 'manage_deals') and app_private.can_access_branch(company_id, branch_id));

create policy "lender_submissions_select_deal_viewers" on public.lender_submissions
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals')));
create policy "lender_submissions_manage_deals" on public.lender_submissions
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_deals'))
  with check (app_private.has_company_permission(company_id, 'manage_deals'));

create policy "deal_approvals_select_deal_viewers" on public.deal_approvals
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_deals') or app_private.has_company_permission(company_id, 'manage_deals') or app_private.has_company_permission(company_id, 'approve_deals')));
create policy "deal_approvals_manage_deals" on public.deal_approvals
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'manage_deals'));
create policy "deal_approvals_approve_deals" on public.deal_approvals
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'approve_deals'))
  with check (app_private.has_company_permission(company_id, 'approve_deals'));

insert into public.lenders (company_id, name, lender_type, country_code, contact_name, contact_email, base_rate, integration_status, is_active)
select c.id, 'Emirates Auto Finance', 'bank'::public.lender_type, 'AE', 'Finance Desk', 'finance@example.test', 4.25, 'manual', true
from public.companies c
on conflict do nothing;

insert into public.insurance_products (company_id, name, provider_name, premium_amount, cost_amount, commission_amount, currency_code)
select c.id, 'Comprehensive Motor Insurance', 'Gulf Shield Insurance', 3500, 2800, 350, c.primary_currency_code
from public.companies c
on conflict do nothing;

insert into public.warranty_products (company_id, name, provider_name, coverage_months, coverage_km, retail_amount, cost_amount, commission_amount, currency_code)
select c.id, 'Extended Warranty 24M', 'AutoSphere Warranty Network', 24, 60000, 4500, 3000, 500, c.primary_currency_code
from public.companies c
on conflict do nothing;
