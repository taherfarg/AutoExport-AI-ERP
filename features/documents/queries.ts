import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import {
  calculateChecklistCompletion,
  getDocumentExpiryState,
  type DocumentChecklistInput,
} from "@/lib/documents/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DocumentPermissions = {
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
  canVerifyDocuments: boolean;
  canManageSignatureRequests: boolean;
};

export type DocumentArchiveRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  document_number: string;
  category: string;
  title: string;
  description: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: string;
  expires_at: string | null;
  verified_at: string | null;
  created_at: string;
  signed_url: string | null;
  branches: { name: string; code: string; country_code: string } | null;
  document_links: { entity_type: string; entity_id: string; label: string | null }[];
};

export type DocumentChecklistRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  document_type: string;
  title: string;
  is_required: boolean;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  branches: { name: string; code: string } | null;
};

export type DocumentVerificationRow = {
  id: string;
  document_id: string;
  status: string;
  notes: string | null;
  verified_at: string;
  verifier: { full_name: string | null; email: string } | null;
};

export type SignatureRequestRow = {
  id: string;
  branch_id: string | null;
  document_id: string | null;
  request_number: string;
  document_type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  sent_to: string;
  signer_name: string | null;
  signer_email: string | null;
  signer_phone: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  status: string;
  signed_by: string | null;
  notes: string | null;
  created_at: string;
  branches: { name: string; code: string } | null;
  documents: { title: string; document_number: string } | null;
};

export type SignedDocumentRow = {
  id: string;
  branch_id: string | null;
  signature_request_id: string;
  document_id: string | null;
  signed_document_number: string;
  storage_bucket: string | null;
  storage_path: string | null;
  signed_by: string;
  signed_at: string;
  signed_url: string | null;
  signature_requests: { request_number: string; document_type: string; sent_to: string } | null;
};

export type DocumentSelectOption = {
  id: string;
  label: string;
};

export type DocumentDashboardData = {
  documents: DocumentArchiveRow[];
  checklists: DocumentChecklistRow[];
  verifications: DocumentVerificationRow[];
  signatureRequests: SignatureRequestRow[];
  signedDocuments: SignedDocumentRow[];
  vehicleOptions: DocumentSelectOption[];
  customerOptions: DocumentSelectOption[];
  stats: {
    archiveCount: number;
    verifiedCount: number;
    expiringSoonCount: number;
    missingRequiredCount: number;
    openSignatureCount: number;
    signedCount: number;
    checklistCompletionPercentage: number;
  };
};

export async function getDocumentPermissions(companyId: string): Promise<DocumentPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewDocuments:
      permissions.has(PERMISSIONS.VIEW_DOCUMENTS) ||
      permissions.has(PERMISSIONS.UPLOAD_DOCUMENTS) ||
      permissions.has(PERMISSIONS.VERIFY_DOCUMENTS),
    canUploadDocuments: permissions.has(PERMISSIONS.UPLOAD_DOCUMENTS),
    canVerifyDocuments: permissions.has(PERMISSIONS.VERIFY_DOCUMENTS),
    canManageSignatureRequests: permissions.has(PERMISSIONS.MANAGE_SIGNATURE_REQUESTS),
  };
}

async function signedUrl(bucket: string | null, path: string | null) {
  if (!bucket || !path) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function getDocumentDashboardData(companyId: string): Promise<DocumentDashboardData> {
  const supabase = await createClient();
  const [
    documentsResult,
    checklistsResult,
    verificationsResult,
    signatureRequestsResult,
    signedDocumentsResult,
    vehiclesResult,
    customersResult,
  ] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, company_id, branch_id, document_number, category, title, description, storage_bucket, storage_path, file_name, mime_type, file_size, status, expires_at, verified_at, created_at, branches(name, code, country_code), document_links(entity_type, entity_id, label)",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("document_checklists")
      .select("id, entity_type, entity_id, document_type, title, is_required, status, due_at, completed_at, branches(name, code)")
      .eq("company_id", companyId)
      .order("is_required", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("document_verifications")
      .select("id, document_id, status, notes, verified_at, verifier:profiles(full_name, email)")
      .eq("company_id", companyId)
      .order("verified_at", { ascending: false })
      .limit(20),
    supabase
      .from("signature_requests")
      .select(
        "id, branch_id, document_id, request_number, document_type, related_entity_type, related_entity_id, sent_to, signer_name, signer_email, signer_phone, sent_at, viewed_at, signed_at, status, signed_by, notes, created_at, branches(name, code), documents(title, document_number)",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("signed_documents")
      .select(
        "id, branch_id, signature_request_id, document_id, signed_document_number, storage_bucket, storage_path, signed_by, signed_at, signature_requests(request_number, document_type, sent_to)",
      )
      .eq("company_id", companyId)
      .order("signed_at", { ascending: false })
      .limit(30),
    supabase
      .from("vehicles")
      .select("id, stock_number, brand, model, year")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("customers")
      .select("id, name, phone, email")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  for (const result of [
    documentsResult,
    checklistsResult,
    verificationsResult,
    signatureRequestsResult,
    signedDocumentsResult,
    vehiclesResult,
    customersResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const documents = await Promise.all(
    ((documentsResult.data ?? []) as unknown as DocumentArchiveRow[]).map(async (document) => ({
      ...document,
      signed_url: await signedUrl(document.storage_bucket, document.storage_path),
    })),
  );
  const signedDocuments = await Promise.all(
    ((signedDocumentsResult.data ?? []) as unknown as SignedDocumentRow[]).map(async (document) => ({
      ...document,
      signed_url: await signedUrl(document.storage_bucket, document.storage_path),
    })),
  );
  const checklists = (checklistsResult.data ?? []) as unknown as DocumentChecklistRow[];
  const checklistSummary = calculateChecklistCompletion(
    checklists.map((item) => ({
      category: item.document_type,
      is_required: item.is_required,
      status: item.status,
    })) satisfies DocumentChecklistInput[],
  );

  return {
    documents,
    checklists,
    verifications: (verificationsResult.data ?? []) as unknown as DocumentVerificationRow[],
    signatureRequests: (signatureRequestsResult.data ?? []) as unknown as SignatureRequestRow[],
    signedDocuments,
    vehicleOptions: ((vehiclesResult.data ?? []) as { id: string; stock_number: string; brand: string; model: string; year: number }[]).map(
      (vehicle) => ({
        id: vehicle.id,
        label: `${vehicle.stock_number} - ${vehicle.year} ${vehicle.brand} ${vehicle.model}`,
      }),
    ),
    customerOptions: ((customersResult.data ?? []) as { id: string; name: string; phone: string | null; email: string | null }[]).map(
      (customer) => ({
        id: customer.id,
        label: `${customer.name}${customer.phone ? ` - ${customer.phone}` : customer.email ? ` - ${customer.email}` : ""}`,
      }),
    ),
    stats: {
      archiveCount: documents.length,
      verifiedCount: documents.filter((document) => document.status === "verified").length,
      expiringSoonCount: documents.filter((document) =>
        ["expired", "expiring_soon"].includes(getDocumentExpiryState({ expiresAt: document.expires_at })),
      ).length,
      missingRequiredCount: checklistSummary.missingCount,
      openSignatureCount: ((signatureRequestsResult.data ?? []) as unknown as SignatureRequestRow[]).filter((request) =>
        ["draft", "sent", "viewed"].includes(request.status),
      ).length,
      signedCount: signedDocuments.length,
      checklistCompletionPercentage: checklistSummary.completionPercentage,
    },
  };
}
