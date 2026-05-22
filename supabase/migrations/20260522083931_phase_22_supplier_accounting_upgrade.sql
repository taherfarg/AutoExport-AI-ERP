create type public.supplier_category as enum (
  'parts',
  'vehicle_supplier',
  'logistics',
  'service',
  'marketing',
  'finance',
  'general_vendor'
);

create type public.supplier_status as enum ('active', 'on_hold', 'inactive', 'archived');

insert into public.modules (module_key, name, description, sort_order, is_core) values
('suppliers', 'Suppliers', 'Shared supplier and vendor master data for finance, accounting, parts, export, and documents.', 83, false)
on conflict (module_key) do nothing;

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key = 'suppliers'
where p.package_key in ('showroom_pro', 'export_business', 'enterprise_dealer_group')
on conflict (package_id, module_id) do update set enabled = excluded.enabled;

insert into public.permissions (module_key, action_key, permission_key, description) values
('finance', 'manage_suppliers', 'manage_suppliers', 'Create and manage shared supplier/vendor master records.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager', 'accountant', 'inventory_manager', 'export_manager')
  and p.permission_key in ('manage_suppliers')
on conflict (role_id, permission_id) do nothing;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier_code text,
  supplier_name text not null,
  legal_name text,
  category public.supplier_category not null default 'general_vendor',
  status public.supplier_status not null default 'active',
  country_code char(2),
  city text,
  contact_name text,
  email text,
  phone text,
  website text,
  tax_registration_number text,
  payment_terms_days integer not null default 30,
  currency_code char(3) not null default 'AED',
  bank_name text,
  bank_account_name text,
  iban text,
  swift_code text,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  unique (company_id, supplier_name),
  unique (company_id, supplier_code),
  constraint suppliers_payment_terms_check check (payment_terms_days >= 0 and payment_terms_days <= 365)
);

alter table public.expenses add column supplier_id uuid;
alter table public.payables add column supplier_id uuid;

alter table public.expenses
  add constraint expenses_supplier_id_company_fk
  foreign key (supplier_id, company_id) references public.suppliers(id, company_id) on delete set null (supplier_id);

alter table public.payables
  add constraint payables_supplier_id_company_fk
  foreign key (supplier_id, company_id) references public.suppliers(id, company_id) on delete set null (supplier_id);

create trigger suppliers_set_updated_at before update on public.suppliers for each row execute function public.set_updated_at();

create or replace function public.sync_part_supplier_to_supplier()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_supplier_id uuid;
  mapped_status public.supplier_status;
begin
  mapped_status := case
    when new.status = 'inactive' then 'inactive'::public.supplier_status
    when new.status = 'archived' then 'archived'::public.supplier_status
    else 'active'::public.supplier_status
  end;

  select id
  into existing_supplier_id
  from public.suppliers
  where company_id = new.company_id
    and supplier_name = new.supplier_name
    and deleted_at is null
  limit 1;

  if existing_supplier_id is not null then
    new.id := existing_supplier_id;
    update public.suppliers
    set category = 'parts'::public.supplier_category,
        status = mapped_status,
        country_code = coalesce(new.country_code, country_code),
        contact_name = coalesce(new.contact_name, contact_name),
        email = coalesce(new.email, email),
        phone = coalesce(new.phone, phone),
        updated_by = new.updated_by,
        updated_at = now()
    where id = existing_supplier_id
      and company_id = new.company_id;
  else
    insert into public.suppliers (
      id,
      company_id,
      supplier_code,
      supplier_name,
      category,
      status,
      country_code,
      contact_name,
      email,
      phone,
      created_by,
      updated_by,
      created_at,
      updated_at,
      deleted_at
    )
    values (
      new.id,
      new.company_id,
      'PART-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
      new.supplier_name,
      'parts'::public.supplier_category,
      mapped_status,
      new.country_code,
      new.contact_name,
      new.email,
      new.phone,
      new.created_by,
      new.updated_by,
      coalesce(new.created_at, now()),
      coalesce(new.updated_at, now()),
      new.deleted_at
    );
  end if;

  return new;
end;
$$;

create trigger part_suppliers_sync_supplier_master
before insert or update on public.part_suppliers
for each row execute function public.sync_part_supplier_to_supplier();

create index suppliers_company_category_idx on public.suppliers(company_id, category, status) where deleted_at is null;
create index suppliers_company_country_idx on public.suppliers(company_id, country_code) where deleted_at is null;
create index expenses_supplier_idx on public.expenses(company_id, supplier_id) where deleted_at is null;
create index payables_supplier_status_idx on public.payables(company_id, supplier_id, status) where deleted_at is null;

grant select, insert, update, delete on public.suppliers to authenticated;
alter table public.suppliers enable row level security;

create policy "suppliers_select_business" on public.suppliers
  for select
  using (
    app_private.has_company_permission(company_id, 'manage_suppliers')
    or app_private.has_company_permission(company_id, 'view_finance')
    or app_private.has_company_permission(company_id, 'manage_finance')
    or app_private.has_company_permission(company_id, 'view_accounting')
    or app_private.has_company_permission(company_id, 'manage_accounting')
    or app_private.has_company_permission(company_id, 'view_parts')
    or app_private.has_company_permission(company_id, 'manage_parts')
    or app_private.has_company_permission(company_id, 'manage_part_orders')
    or app_private.has_company_permission(company_id, 'manage_exports')
  );

create policy "suppliers_manage_business" on public.suppliers
  for all
  using (
    app_private.has_company_permission(company_id, 'manage_suppliers')
    or app_private.has_company_permission(company_id, 'manage_finance')
    or app_private.has_company_permission(company_id, 'manage_accounting')
    or app_private.has_company_permission(company_id, 'manage_parts')
    or app_private.has_company_permission(company_id, 'manage_part_orders')
  )
  with check (
    app_private.has_company_permission(company_id, 'manage_suppliers')
    or app_private.has_company_permission(company_id, 'manage_finance')
    or app_private.has_company_permission(company_id, 'manage_accounting')
    or app_private.has_company_permission(company_id, 'manage_parts')
    or app_private.has_company_permission(company_id, 'manage_part_orders')
  );

insert into public.suppliers (
  id,
  company_id,
  supplier_code,
  supplier_name,
  category,
  status,
  country_code,
  contact_name,
  email,
  phone,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at
)
select
  ps.id,
  ps.company_id,
  'PART-' || upper(substr(replace(ps.id::text, '-', ''), 1, 8)),
  ps.supplier_name,
  'parts'::public.supplier_category,
  case when ps.status = 'active' then 'active'::public.supplier_status when ps.status = 'inactive' then 'inactive'::public.supplier_status else 'archived'::public.supplier_status end,
  ps.country_code,
  ps.contact_name,
  ps.email,
  ps.phone,
  ps.created_by,
  ps.updated_by,
  ps.created_at,
  ps.updated_at,
  ps.deleted_at
from public.part_suppliers ps
on conflict (company_id, supplier_name) do nothing;

insert into public.suppliers (
  company_id,
  supplier_code,
  supplier_name,
  category,
  status,
  currency_code,
  created_by,
  updated_by
)
select distinct
  p.company_id,
  'AP-' || upper(substr(md5(p.company_id::text || p.supplier_name), 1, 8)),
  p.supplier_name,
  'general_vendor'::public.supplier_category,
  'active'::public.supplier_status,
  p.currency_code,
  p.created_by,
  p.updated_by
from public.payables p
where p.supplier_name is not null
on conflict (company_id, supplier_name) do nothing;

insert into public.suppliers (
  company_id,
  supplier_code,
  supplier_name,
  category,
  status,
  currency_code,
  created_by,
  updated_by
)
select distinct
  e.company_id,
  'EXP-' || upper(substr(md5(e.company_id::text || e.supplier_name), 1, 8)),
  e.supplier_name,
  'general_vendor'::public.supplier_category,
  'active'::public.supplier_status,
  e.currency_code,
  e.created_by,
  e.updated_by
from public.expenses e
where e.supplier_name is not null and length(trim(e.supplier_name)) > 0
on conflict (company_id, supplier_name) do nothing;

update public.payables p
set supplier_id = s.id
from public.suppliers s
where s.company_id = p.company_id
  and s.supplier_name = p.supplier_name
  and p.supplier_id is null;

update public.expenses e
set supplier_id = s.id
from public.suppliers s
where s.company_id = e.company_id
  and s.supplier_name = e.supplier_name
  and e.supplier_id is null;

alter table public.part_purchase_orders
  add constraint part_purchase_orders_supplier_master_fk
  foreign key (supplier_id, company_id) references public.suppliers(id, company_id) on delete set null (supplier_id);
