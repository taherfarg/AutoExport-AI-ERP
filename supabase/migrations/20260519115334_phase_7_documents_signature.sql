create type public.document_category as enum (
  'vehicle_title',
  'export_certificate',
  'customs_certificate',
  'purchase_invoice',
  'sales_invoice',
  'proforma_invoice',
  'bill_of_lading',
  'certificate_of_origin',
  'insurance',
  'inspection_report',
  'customer_id_passport',
  'sales_contract',
  'reservation_agreement',
  'delivery_note',
  'signature',
  'other'
);
create type public.document_archive_status as enum ('draft', 'uploaded', 'verified', 'rejected', 'expired', 'archived');
create type public.document_link_entity as enum (
  'company',
  'branch',
  'vehicle',
  'customer',
  'lead',
  'quotation',
  'reservation',
  'proforma_invoice',
  'sales_invoice',
  'payment',
  'export_order',
  'import_order',
  'signature_request'
);
create type public.document_verification_status as enum ('pending', 'verified', 'rejected');
create type public.signature_request_status as enum ('draft', 'sent', 'viewed', 'signed', 'rejected', 'expired');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  31457280,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.permissions (module_key, action_key, permission_key, description) values
('documents', 'view', 'view_documents', 'View document archive and signature records.'),
('documents', 'manage_signatures', 'manage_signature_requests', 'Manage internal signature requests.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (company_id, role_id, permission_id)
select r.company_id, r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system_role = true
  and r.role_key in ('company_owner', 'owner', 'super_admin')
  and p.permission_key in ('view_documents', 'upload_documents', 'verify_documents', 'manage_signature_requests')
on conflict (role_id, permission_id) do nothing;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  document_number text not null,
  category public.document_category not null default 'other',
  title text not null,
  description text,
  storage_bucket text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size bigint,
  status public.document_archive_status not null default 'uploaded',
  expires_at date,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, document_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id)
);

create table public.document_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null,
  entity_type public.document_link_entity not null,
  entity_id uuid not null,
  label text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (company_id, document_id, entity_type, entity_id),
  foreign key (document_id, company_id) references public.documents(id, company_id) on delete cascade
);

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  template_key text not null,
  name text not null,
  category public.document_category not null default 'other',
  body text,
  is_system boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, template_key),
  unique (id, company_id)
);

create table public.document_checklists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  entity_type public.document_link_entity not null,
  entity_id uuid not null,
  document_type public.document_category not null,
  title text not null,
  is_required boolean not null default true,
  status public.document_archive_status not null default 'draft',
  document_id uuid,
  due_at date,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, entity_type, entity_id, document_type),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (document_id, company_id) references public.documents(id, company_id) on delete set null (document_id)
);

create table public.document_verifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null,
  status public.document_verification_status not null,
  notes text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (document_id, company_id) references public.documents(id, company_id) on delete cascade
);

create table public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  document_id uuid,
  request_number text not null,
  document_type public.document_category not null default 'sales_contract',
  related_entity_type public.document_link_entity,
  related_entity_id uuid,
  sent_to text not null,
  signer_name text,
  signer_email text,
  signer_phone text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  status public.signature_request_status not null default 'draft',
  signed_by text,
  ip_address inet,
  device_info text,
  signature_storage_bucket text,
  signature_storage_path text,
  notes text,
  audit_log_id uuid references public.audit_logs(id) on delete set null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, request_number),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (document_id, company_id) references public.documents(id, company_id) on delete set null (document_id)
);

create table public.signed_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid,
  signature_request_id uuid not null,
  document_id uuid,
  signed_document_number text not null,
  storage_bucket text,
  storage_path text,
  signed_by text not null,
  signed_at timestamptz not null default now(),
  ip_address inet,
  device_info text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (company_id, signed_document_number),
  unique (company_id, signature_request_id),
  unique (id, company_id),
  foreign key (branch_id, company_id) references public.branches(id, company_id) on delete set null (branch_id),
  foreign key (signature_request_id, company_id) references public.signature_requests(id, company_id) on delete cascade,
  foreign key (document_id, company_id) references public.documents(id, company_id) on delete set null (document_id)
);

create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger document_templates_set_updated_at before update on public.document_templates for each row execute function public.set_updated_at();
create trigger document_checklists_set_updated_at before update on public.document_checklists for each row execute function public.set_updated_at();
create trigger signature_requests_set_updated_at before update on public.signature_requests for each row execute function public.set_updated_at();

create or replace function app_private.after_document_verification_changed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.documents
  set status = case
        when new.status = 'verified' then 'verified'::public.document_archive_status
        when new.status = 'rejected' then 'rejected'::public.document_archive_status
        else status
      end,
      verified_by = case when new.status = 'verified' then new.verified_by else verified_by end,
      verified_at = case when new.status = 'verified' then new.verified_at else verified_at end
  where id = new.document_id
    and company_id = new.company_id;

  update public.document_checklists
  set status = case
        when new.status = 'verified' then 'verified'::public.document_archive_status
        when new.status = 'rejected' then 'rejected'::public.document_archive_status
        else status
      end,
      completed_at = case when new.status = 'verified' then new.verified_at else completed_at end
  where document_id = new.document_id
    and company_id = new.company_id;

  return new;
end;
$$;

create trigger document_verifications_after_changed
  after insert on public.document_verifications
  for each row execute function app_private.after_document_verification_changed();

create index documents_company_status_idx on public.documents(company_id, status) where deleted_at is null;
create index documents_company_category_idx on public.documents(company_id, category) where deleted_at is null;
create index document_links_company_entity_idx on public.document_links(company_id, entity_type, entity_id);
create index document_checklists_company_entity_idx on public.document_checklists(company_id, entity_type, entity_id, status);
create index document_verifications_company_document_idx on public.document_verifications(company_id, document_id);
create index signature_requests_company_status_idx on public.signature_requests(company_id, status) where deleted_at is null;
create index signed_documents_company_request_idx on public.signed_documents(company_id, signature_request_id);

grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.document_links to authenticated;
grant select, insert, update, delete on public.document_templates to authenticated;
grant select, insert, update, delete on public.document_checklists to authenticated;
grant select, insert, update, delete on public.document_verifications to authenticated;
grant select, insert, update, delete on public.signature_requests to authenticated;
grant select, insert, update, delete on public.signed_documents to authenticated;

alter table public.documents enable row level security;
alter table public.document_links enable row level security;
alter table public.document_templates enable row level security;
alter table public.document_checklists enable row level security;
alter table public.document_verifications enable row level security;
alter table public.signature_requests enable row level security;
alter table public.signed_documents enable row level security;

create policy "documents_select_viewers" on public.documents
  for select to authenticated
  using (
    deleted_at is null
    and (app_private.has_company_permission(company_id, 'view_documents') or app_private.has_company_permission(company_id, 'upload_documents'))
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "documents_insert_uploaders" on public.documents
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "documents_update_uploaders" on public.documents
  for update to authenticated
  using (app_private.has_company_permission(company_id, 'upload_documents') or app_private.has_company_permission(company_id, 'verify_documents'))
  with check (app_private.has_company_permission(company_id, 'upload_documents') or app_private.has_company_permission(company_id, 'verify_documents'));

create policy "document_links_select_viewers" on public.document_links
  for select to authenticated
  using (app_private.has_company_permission(company_id, 'view_documents'));

create policy "document_links_manage_uploaders" on public.document_links
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'upload_documents'))
  with check (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "document_templates_select_viewers" on public.document_templates
  for select to authenticated
  using ((company_id is null or app_private.is_company_member(company_id)) and deleted_at is null);

create policy "document_templates_manage_uploaders" on public.document_templates
  for all to authenticated
  using (company_id is not null and app_private.has_company_permission(company_id, 'upload_documents'))
  with check (company_id is not null and app_private.has_company_permission(company_id, 'upload_documents'));

create policy "document_checklists_select_viewers" on public.document_checklists
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_documents')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "document_checklists_manage_uploaders" on public.document_checklists
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'upload_documents'))
  with check (app_private.has_company_permission(company_id, 'upload_documents'));

create policy "document_verifications_select_viewers" on public.document_verifications
  for select to authenticated
  using (app_private.has_company_permission(company_id, 'view_documents'));

create policy "document_verifications_insert_verifiers" on public.document_verifications
  for insert to authenticated
  with check (app_private.has_company_permission(company_id, 'verify_documents'));

create policy "signature_requests_select_viewers" on public.signature_requests
  for select to authenticated
  using (
    deleted_at is null
    and app_private.has_company_permission(company_id, 'view_documents')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "signature_requests_manage" on public.signature_requests
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_signature_requests'))
  with check (app_private.has_company_permission(company_id, 'manage_signature_requests'));

create policy "signed_documents_select_viewers" on public.signed_documents
  for select to authenticated
  using (
    app_private.has_company_permission(company_id, 'view_documents')
    and app_private.can_access_branch(company_id, branch_id)
  );

create policy "signed_documents_manage" on public.signed_documents
  for all to authenticated
  using (app_private.has_company_permission(company_id, 'manage_signature_requests'))
  with check (app_private.has_company_permission(company_id, 'manage_signature_requests'));

create policy "documents_bucket_select_company_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and app_private.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_bucket_insert_uploaders" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  );

create policy "documents_bucket_update_uploaders" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  )
  with check (
    bucket_id = 'documents'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  );

create policy "documents_bucket_delete_uploaders" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and app_private.has_company_permission(((storage.foldername(name))[1])::uuid, 'upload_documents')
  );

insert into public.document_templates (company_id, template_key, name, category, body, is_system)
select null, template_key, name, category::public.document_category, body, true
from (values
  ('reservation_agreement', 'Reservation Agreement', 'reservation_agreement', 'Vehicle reservation agreement template.'),
  ('sales_contract', 'Sales Contract', 'sales_contract', 'Vehicle sales contract template.'),
  ('delivery_note', 'Delivery Note', 'delivery_note', 'Vehicle delivery note template.'),
  ('export_agreement', 'Export Agreement', 'sales_contract', 'Export sales agreement template.')
) as templates(template_key, name, category, body)
on conflict (company_id, template_key) do nothing;

insert into public.documents (
  company_id,
  branch_id,
  document_number,
  category,
  title,
  description,
  status
)
select b.company_id, b.id, 'DOC-SEED-' || b.code, 'sales_contract'::public.document_category, 'Seed sales contract', 'Seed document archive record.', 'uploaded'::public.document_archive_status
from public.branches b
where b.code in ('DXB-HQ', 'UAE-EXP', 'EMT-DXB', 'SAH-DZ')
on conflict (company_id, document_number) do nothing;
