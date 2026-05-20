create type public.technician_status as enum ('active', 'inactive', 'on_leave');
create type public.service_order_status as enum ('draft', 'scheduled', 'checked_in', 'in_progress', 'quality_check', 'completed', 'cancelled');
create type public.service_job_status as enum ('pending', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled');
create type public.service_labor_type as enum ('diagnosis', 'repair', 'inspection', 'detailing', 'warranty', 'other');
create type public.service_appointment_status as enum ('requested', 'scheduled', 'checked_in', 'completed', 'no_show', 'cancelled');
create type public.inspection_result_status as enum ('pass', 'attention', 'fail', 'not_applicable');
create type public.warranty_claim_status as enum ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled');
create type public.service_priority as enum ('low', 'normal', 'high', 'urgent');

insert into public.modules (module_key, name, description, sort_order, is_core) values
('service', 'Service Workshop', 'Repair orders, job cards, technicians, inspections, warranty claims, and appointments.', 84, false)
on conflict (module_key) do nothing;

insert into public.package_modules (package_id, module_id, enabled)
select p.id, m.id, true
from public.packages p
join public.modules m on m.module_key = 'service'
where p.package_key in ('showroom_pro', 'export_business', 'enterprise_dealer_group')
on conflict (package_id, module_id) do update set enabled = excluded.enabled;

insert into public.permissions (module_key, action_key, permission_key, description) values
('service', 'view', 'view_service', 'View service workshop records.'),
('service', 'manage', 'manage_service', 'Create and manage service workshop records.'),
('service', 'assign_jobs', 'assign_service_jobs', 'Assign service jobs to technicians.'),
('service', 'manage_warranty', 'manage_warranty_claims', 'Create and manage warranty claims.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin', 'general_manager', 'branch_manager', 'inventory_manager')
  and p.permission_key in ('view_service', 'manage_service', 'assign_service_jobs', 'manage_warranty_claims')
on conflict (role_id, permission_id) do nothing;

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  specialization text,
  phone text,
  hourly_rate numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  status public.technician_status not null default 'active',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  constraint technicians_rate_check check (hourly_rate >= 0)
);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  vehicle_id uuid,
  customer_id uuid,
  order_number text not null,
  title text not null,
  complaint text,
  odometer integer,
  priority public.service_priority not null default 'normal',
  status public.service_order_status not null default 'draft',
  advisor_id uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  labor_total numeric(14,2) not null default 0,
  parts_total numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, order_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  constraint service_orders_odometer_check check (odometer is null or odometer >= 0),
  constraint service_orders_totals_check check (labor_total >= 0 and parts_total >= 0 and total_amount >= 0)
);

create table public.service_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  service_order_id uuid not null,
  technician_id uuid,
  job_number text not null,
  title text not null,
  description text,
  labor_type public.service_labor_type not null default 'repair',
  status public.service_job_status not null default 'pending',
  estimated_hours numeric(8,2) not null default 0,
  actual_hours numeric(8,2) not null default 0,
  labor_rate numeric(14,2) not null default 0,
  labor_amount numeric(14,2) not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, job_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (service_order_id, company_id) references public.service_orders(id, company_id) on delete cascade,
  foreign key (technician_id, company_id) references public.technicians(id, company_id) on delete set null (technician_id),
  constraint service_jobs_amounts_check check (estimated_hours >= 0 and actual_hours >= 0 and labor_rate >= 0 and labor_amount >= 0)
);

create table public.service_labor_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  service_order_id uuid not null,
  service_job_id uuid,
  technician_id uuid,
  line_number text not null,
  labor_type public.service_labor_type not null default 'repair',
  description text not null,
  hours numeric(8,2) not null default 0,
  hourly_rate numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0,
  performed_at timestamptz not null default now(),
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
  foreign key (technician_id, company_id) references public.technicians(id, company_id) on delete set null (technician_id),
  constraint service_labor_lines_amounts_check check (hours >= 0 and hourly_rate >= 0 and amount >= 0)
);

create table public.inspection_checklists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  name text not null,
  checklist_type text not null default 'vehicle_health',
  items jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, name),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  constraint inspection_checklists_items_check check (jsonb_typeof(items) = 'array')
);

create table public.inspection_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  service_order_id uuid not null,
  checklist_id uuid,
  vehicle_id uuid,
  technician_id uuid,
  result_number text not null,
  overall_status public.inspection_result_status not null default 'pass',
  score_percent numeric(5,2) not null default 100,
  results jsonb not null default '{}'::jsonb,
  notes text,
  inspected_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, result_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (service_order_id, company_id) references public.service_orders(id, company_id) on delete cascade,
  foreign key (checklist_id, company_id) references public.inspection_checklists(id, company_id) on delete set null (checklist_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (technician_id, company_id) references public.technicians(id, company_id) on delete set null (technician_id),
  constraint inspection_results_score_check check (score_percent >= 0 and score_percent <= 100)
);

create table public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  service_order_id uuid,
  vehicle_id uuid,
  customer_id uuid,
  claim_number text not null,
  provider_name text not null,
  claim_amount numeric(14,2) not null default 0,
  approved_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'AED',
  status public.warranty_claim_status not null default 'draft',
  submitted_at timestamptz,
  decided_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, claim_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (service_order_id, company_id) references public.service_orders(id, company_id) on delete set null (service_order_id),
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  constraint warranty_claims_amounts_check check (claim_amount >= 0 and approved_amount >= 0 and paid_amount >= 0)
);

create table public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null,
  vehicle_id uuid,
  customer_id uuid,
  appointment_number text not null,
  title text not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  status public.service_appointment_status not null default 'scheduled',
  advisor_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, appointment_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete restrict,
  foreign key (vehicle_id, company_id) references public.vehicles(id, company_id) on delete set null (vehicle_id),
  foreign key (customer_id, company_id) references public.customers(id, company_id) on delete set null (customer_id),
  constraint service_appointments_time_check check (scheduled_end is null or scheduled_end >= scheduled_start)
);

create or replace function public.set_service_labor_amount()
returns trigger
language plpgsql
as $$
begin
  new.amount := round(coalesce(new.hours, 0) * coalesce(new.hourly_rate, 0), 2);
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

  select coalesce(parts_total, 0)
  into parts_sum
  from public.service_orders
  where id = target_order_id
    and company_id = target_company_id;

  update public.service_orders
  set labor_total = labor_sum,
      total_amount = labor_sum + coalesce(parts_sum, 0),
      updated_at = now()
  where id = target_order_id
    and company_id = target_company_id;
end;
$$;

create or replace function app_private.refresh_service_order_totals_from_line()
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

create trigger technicians_set_updated_at before update on public.technicians for each row execute function public.set_updated_at();
create trigger service_orders_set_updated_at before update on public.service_orders for each row execute function public.set_updated_at();
create trigger service_jobs_set_updated_at before update on public.service_jobs for each row execute function public.set_updated_at();
create trigger service_labor_lines_set_updated_at before update on public.service_labor_lines for each row execute function public.set_updated_at();
create trigger inspection_checklists_set_updated_at before update on public.inspection_checklists for each row execute function public.set_updated_at();
create trigger inspection_results_set_updated_at before update on public.inspection_results for each row execute function public.set_updated_at();
create trigger warranty_claims_set_updated_at before update on public.warranty_claims for each row execute function public.set_updated_at();
create trigger service_appointments_set_updated_at before update on public.service_appointments for each row execute function public.set_updated_at();
create trigger service_labor_lines_set_amount before insert or update on public.service_labor_lines for each row execute function public.set_service_labor_amount();
create trigger service_labor_lines_refresh_order after insert or update or delete on public.service_labor_lines for each row execute function app_private.refresh_service_order_totals_from_line();

create index technicians_company_branch_idx on public.technicians(company_id, branch_id, status) where deleted_at is null;
create index service_orders_company_branch_status_idx on public.service_orders(company_id, branch_id, status, created_at desc) where deleted_at is null;
create index service_orders_company_vehicle_idx on public.service_orders(company_id, vehicle_id) where deleted_at is null;
create index service_jobs_company_order_idx on public.service_jobs(company_id, service_order_id, status) where deleted_at is null;
create index service_jobs_company_technician_idx on public.service_jobs(company_id, technician_id, status) where deleted_at is null;
create index service_labor_company_order_idx on public.service_labor_lines(company_id, service_order_id) where deleted_at is null;
create index inspection_checklists_company_idx on public.inspection_checklists(company_id, is_active) where deleted_at is null;
create index inspection_results_company_order_idx on public.inspection_results(company_id, service_order_id, inspected_at desc) where deleted_at is null;
create index warranty_claims_company_status_idx on public.warranty_claims(company_id, status, created_at desc) where deleted_at is null;
create index service_appointments_company_schedule_idx on public.service_appointments(company_id, branch_id, scheduled_start, status) where deleted_at is null;

grant select, insert, update, delete on public.technicians to authenticated;
grant select, insert, update, delete on public.service_orders to authenticated;
grant select, insert, update, delete on public.service_jobs to authenticated;
grant select, insert, update, delete on public.service_labor_lines to authenticated;
grant select, insert, update, delete on public.inspection_checklists to authenticated;
grant select, insert, update, delete on public.inspection_results to authenticated;
grant select, insert, update, delete on public.warranty_claims to authenticated;
grant select, insert, update, delete on public.service_appointments to authenticated;

alter table public.technicians enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_jobs enable row level security;
alter table public.service_labor_lines enable row level security;
alter table public.inspection_checklists enable row level security;
alter table public.inspection_results enable row level security;
alter table public.warranty_claims enable row level security;
alter table public.service_appointments enable row level security;

create policy "technicians_select_service" on public.technicians
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service') or app_private.has_company_permission(company_id, 'assign_service_jobs')) and app_private.can_access_branch(company_id, branch_id));
create policy "technicians_manage_service" on public.technicians
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_service'))
  with check (app_private.has_company_permission(company_id, 'manage_service') and app_private.can_access_branch(company_id, branch_id));

create policy "service_orders_select_service" on public.service_orders
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));
create policy "service_orders_manage_service" on public.service_orders
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_service'))
  with check (app_private.has_company_permission(company_id, 'manage_service') and app_private.can_access_branch(company_id, branch_id));

create policy "service_jobs_select_service" on public.service_jobs
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service') or app_private.has_company_permission(company_id, 'assign_service_jobs')) and app_private.can_access_branch(company_id, branch_id));
create policy "service_jobs_manage_service" on public.service_jobs
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_service') or app_private.has_company_permission(company_id, 'assign_service_jobs'))
  with check ((app_private.has_company_permission(company_id, 'manage_service') or app_private.has_company_permission(company_id, 'assign_service_jobs')) and app_private.can_access_branch(company_id, branch_id));

create policy "service_labor_select_service" on public.service_labor_lines
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));
create policy "service_labor_manage_service" on public.service_labor_lines
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_service'))
  with check (app_private.has_company_permission(company_id, 'manage_service') and app_private.can_access_branch(company_id, branch_id));

create policy "inspection_checklists_select_service" on public.inspection_checklists
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));
create policy "inspection_checklists_manage_service" on public.inspection_checklists
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_service'))
  with check (app_private.has_company_permission(company_id, 'manage_service') and app_private.can_access_branch(company_id, branch_id));

create policy "inspection_results_select_service" on public.inspection_results
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));
create policy "inspection_results_manage_service" on public.inspection_results
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_service'))
  with check (app_private.has_company_permission(company_id, 'manage_service') and app_private.can_access_branch(company_id, branch_id));

create policy "warranty_claims_select_service" on public.warranty_claims
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_warranty_claims') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));
create policy "warranty_claims_manage_service" on public.warranty_claims
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_warranty_claims') or app_private.has_company_permission(company_id, 'manage_service'))
  with check ((app_private.has_company_permission(company_id, 'manage_warranty_claims') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));

create policy "service_appointments_select_service" on public.service_appointments
  for select to authenticated
  using (deleted_at is null and (app_private.has_company_permission(company_id, 'view_service') or app_private.has_company_permission(company_id, 'manage_service')) and app_private.can_access_branch(company_id, branch_id));
create policy "service_appointments_manage_service" on public.service_appointments
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_service'))
  with check (app_private.has_company_permission(company_id, 'manage_service') and app_private.can_access_branch(company_id, branch_id));

insert into public.inspection_checklists (company_id, name, checklist_type, items, is_active)
select c.id, 'Vehicle Health Check', 'vehicle_health', '[
  {"key":"engine","label":"Engine condition"},
  {"key":"brakes","label":"Brake system"},
  {"key":"tires","label":"Tires and wheels"},
  {"key":"lights","label":"Lights and electrical"},
  {"key":"body","label":"Body and paint"}
]'::jsonb, true
from public.companies c
on conflict (company_id, name) do nothing;

insert into public.technicians (company_id, branch_id, display_name, specialization, hourly_rate, currency_code, status)
select b.company_id, b.id, 'Senior Technician', 'General diagnostics', 180, b.currency_code, 'active'::public.technician_status
from public.branches b
where b.deleted_at is null
on conflict do nothing;
