begin;

select plan(7);

select ok(
  exists(select 1 from storage.buckets where id = 'documents' and public is false),
  'documents storage bucket is private'
);

select ok(
  not exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'documents',
        'document_links',
        'document_templates',
        'document_checklists',
        'document_verifications',
        'signature_requests',
        'signed_documents'
      )
      and rowsecurity is false
  ),
  'all phase 7 document tables have RLS enabled'
);

select ok(
  exists(select 1 from public.permissions where permission_key = 'view_documents')
  and exists(select 1 from public.permissions where permission_key = 'manage_signature_requests'),
  'phase 7 document permissions exist'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'documents_bucket_insert_uploaders'
      and with_check like '%upload_documents%'
  ),
  'documents storage insert policy checks upload permission'
);

create temp table document_probe_ids as
select gen_random_uuid() as user_a,
       gen_random_uuid() as user_b,
       gen_random_uuid() as company_a,
       gen_random_uuid() as company_b,
       gen_random_uuid() as branch_a,
       gen_random_uuid() as branch_b,
       gen_random_uuid() as role_a,
       gen_random_uuid() as role_b,
       gen_random_uuid() as document_a,
       gen_random_uuid() as document_b,
       gen_random_uuid() as signature_a;

grant select on document_probe_ids to authenticated;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
select user_a,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'document-a@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from document_probe_ids
union all
select user_b,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated',
       'authenticated',
       'document-b@example.test',
       '',
       now(),
       now(),
       now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       '{}'::jsonb
from document_probe_ids;

insert into public.companies (id, name, slug)
select company_a, 'Document Company A', 'document-company-a' from document_probe_ids
union all
select company_b, 'Document Company B', 'document-company-b' from document_probe_ids;

insert into public.branches (id, company_id, name, code, city)
select branch_a, company_a, 'Document Branch A', 'DCA', 'Dubai' from document_probe_ids
union all
select branch_b, company_b, 'Document Branch B', 'DCB', 'Doha' from document_probe_ids;

insert into public.company_memberships (company_id, profile_id, status, joined_at)
select company_a, user_a, 'active'::public.member_status, now() from document_probe_ids
union all
select company_b, user_b, 'active'::public.member_status, now() from document_probe_ids;

insert into public.branch_memberships (company_id, branch_id, profile_id, status)
select company_a, branch_a, user_a, 'active'::public.member_status from document_probe_ids
union all
select company_b, branch_b, user_b, 'active'::public.member_status from document_probe_ids;

insert into public.roles (id, company_id, name, role_key, description, is_system_role)
select role_a, company_a, 'Document Controller A', 'document_controller_a', 'Document controller test role.', true from document_probe_ids
union all
select role_b, company_b, 'Document Controller B', 'document_controller_b', 'Document controller test role.', true from document_probe_ids;

insert into public.role_permissions (company_id, role_id, permission_id)
select ids.company_a, ids.role_a, p.id
from document_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_documents',
  'upload_documents',
  'verify_documents',
  'manage_signature_requests'
)
union all
select ids.company_b, ids.role_b, p.id
from document_probe_ids ids
join public.permissions p on p.permission_key in (
  'view_documents',
  'upload_documents',
  'verify_documents',
  'manage_signature_requests'
);

insert into public.user_roles (company_id, profile_id, role_id)
select company_a, user_a, role_a from document_probe_ids
union all
select company_b, user_b, role_b from document_probe_ids;

insert into public.documents (
  id,
  company_id,
  branch_id,
  document_number,
  category,
  title,
  status,
  created_by
)
select document_a, company_a, branch_a, 'DOC-A-001', 'sales_contract'::public.document_category, 'A contract', 'uploaded'::public.document_archive_status, user_a
from document_probe_ids
union all
select document_b, company_b, branch_b, 'DOC-B-001', 'sales_contract'::public.document_category, 'B contract', 'uploaded'::public.document_archive_status, user_b
from document_probe_ids;

insert into public.signature_requests (
  id,
  company_id,
  branch_id,
  document_id,
  request_number,
  document_type,
  sent_to,
  signer_name,
  status,
  created_by
)
select signature_a, company_a, branch_a, document_a, 'SIG-A-001', 'sales_contract'::public.document_category, 'buyer@example.test', 'Buyer A', 'sent'::public.signature_request_status, user_a
from document_probe_ids;

select set_config('request.jwt.claim.sub', (select user_a::text from document_probe_ids), true);
set local role authenticated;

select is(
  (select array_agg(document_number order by document_number) from public.documents where document_number like 'DOC-_-%'),
  array['DOC-A-001']::text[],
  'document RLS only exposes current company documents'
);

insert into public.document_verifications (
  company_id,
  document_id,
  status,
  notes,
  verified_by
)
select company_a, document_a, 'verified'::public.document_verification_status, 'Looks complete.', user_a
from document_probe_ids;

select is(
  (select status::text from public.documents where document_number = 'DOC-A-001'),
  'verified',
  'document verification updates document status'
);

insert into public.signed_documents (
  company_id,
  branch_id,
  signature_request_id,
  document_id,
  signed_document_number,
  signed_by,
  created_by
)
select company_a, branch_a, signature_a, document_a, 'SIGNED-A-001', 'Buyer A', user_a
from document_probe_ids;

select is(
  (select count(*)::integer from public.signed_documents where signed_document_number = 'SIGNED-A-001'),
  1,
  'signature manager can create signed document archive record'
);

reset role;

select * from finish();

rollback;
