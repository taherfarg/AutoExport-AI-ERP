"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { makeDocumentNumber, makeSignatureRequestNumber } from "@/lib/documents/format";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createDocumentSchema,
  createSignatureRequestSchema,
  signDocumentSchema,
  verifyDocumentSchema,
} from "@/lib/validations/documents";

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

async function requireDocumentPermission(permissionKey: string) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(permissionKey)) {
    throw new Error("You do not have permission for this document action.");
  }

  return workspace;
}

async function writeAuditLog({
  companyId,
  branchId,
  actorProfileId,
  action,
  entityType,
  entityId,
  newValues,
}: {
  companyId: string;
  branchId?: string | null;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    branch_id: branchId,
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    severity: "info",
    new_values: newValues ?? null,
  });
}

async function uploadDocumentFile(file: File, storagePath: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createDocumentRecord(formData: FormData) {
  const workspace = await requireDocumentPermission(PERMISSIONS.UPLOAD_DOCUMENTS);
  const file = formFile(formData.get("documentFile"));

  if (!file) {
    return { error: "Choose a document file to upload." };
  }

  const category = String(formData.get("category") ?? "other");
  const storagePath = `${workspace.companyId}/archive/${category}/${Date.now()}-${safeFileName(file.name)}`;
  const parsed = createDocumentSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    documentNumber: formOptional(formData.get("documentNumber")) ?? makeDocumentNumber(),
    category,
    title: formData.get("title"),
    description: formOptional(formData.get("description")),
    storageBucket: "documents",
    storagePath,
    originalFileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    expiresAt: formOptional(formData.get("expiresAt")),
    entityType: formOptional(formData.get("entityType")),
    entityId: formOptional(formData.get("entityId")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Document details are invalid." };
  }

  await uploadDocumentFile(file, storagePath);

  const supabase = createServiceRoleClient();
  const { data: documentRow, error } = await supabase
    .from("documents")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      document_number: parsed.data.documentNumber,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      storage_bucket: parsed.data.storageBucket,
      storage_path: parsed.data.storagePath,
      file_name: parsed.data.originalFileName,
      mime_type: parsed.data.mimeType,
      file_size: parsed.data.fileSize,
      status: "uploaded",
      expires_at: parsed.data.expiresAt,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !documentRow) {
    return { error: error?.message ?? "Document could not be created." };
  }

  if (parsed.data.entityType && parsed.data.entityId) {
    await supabase.from("document_links").insert({
      company_id: workspace.companyId,
      document_id: documentRow.id,
      entity_type: parsed.data.entityType,
      entity_id: parsed.data.entityId,
      label: parsed.data.title,
      created_by: workspace.profileId,
    });

    await supabase.from("document_checklists").upsert(
      {
        company_id: workspace.companyId,
        branch_id: parsed.data.branchId,
        entity_type: parsed.data.entityType,
        entity_id: parsed.data.entityId,
        document_type: parsed.data.category,
        title: parsed.data.title,
        status: "uploaded",
        document_id: documentRow.id,
        updated_by: workspace.profileId,
      },
      { onConflict: "company_id,entity_type,entity_id,document_type" },
    );
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_document",
    entityType: "document",
    entityId: documentRow.id,
    newValues: { category: parsed.data.category, title: parsed.data.title },
  });

  revalidatePath("/documents");
}

export async function verifyDocument(formData: FormData) {
  const workspace = await requireDocumentPermission(PERMISSIONS.VERIFY_DOCUMENTS);
  const parsed = verifyDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    status: formData.get("status"),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: "Verification details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data: documentRow, error: documentError } = await supabase
    .from("documents")
    .select("id, branch_id, title")
    .eq("id", parsed.data.documentId)
    .eq("company_id", workspace.companyId)
    .is("deleted_at", null)
    .single();

  if (documentError || !documentRow) {
    return { error: "Document was not found." };
  }

  const { error } = await supabase.from("document_verifications").insert({
    company_id: workspace.companyId,
    document_id: parsed.data.documentId,
    status: parsed.data.status,
    notes: parsed.data.notes,
    verified_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: documentRow.branch_id,
    actorProfileId: workspace.profileId,
    action: "verify_document",
    entityType: "document",
    entityId: documentRow.id,
    newValues: { status: parsed.data.status, title: documentRow.title },
  });

  revalidatePath("/documents");
}

export async function createSignatureRequest(formData: FormData) {
  const workspace = await requireDocumentPermission(PERMISSIONS.MANAGE_SIGNATURE_REQUESTS);
  const customerId = formOptional(formData.get("relatedCustomerId"));
  const vehicleId = formOptional(formData.get("relatedVehicleId"));
  const parsed = createSignatureRequestSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    requestNumber: formOptional(formData.get("requestNumber")) ?? makeSignatureRequestNumber(),
    documentType: formData.get("documentType"),
    title: formData.get("title"),
    relatedCustomerId: customerId,
    relatedVehicleId: vehicleId,
    sourceDocumentId: formOptional(formData.get("sourceDocumentId")),
    sentToName: formData.get("sentToName"),
    sentToEmail: formOptional(formData.get("sentToEmail")),
    sentToPhone: formOptional(formData.get("sentToPhone")),
    expiresAt: formOptional(formData.get("expiresAt")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Signature request details are invalid." };
  }

  const relatedEntityType = parsed.data.relatedCustomerId
    ? "customer"
    : parsed.data.relatedVehicleId
      ? "vehicle"
      : undefined;
  const relatedEntityId = parsed.data.relatedCustomerId ?? parsed.data.relatedVehicleId;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("signature_requests")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      document_id: parsed.data.sourceDocumentId,
      request_number: parsed.data.requestNumber,
      document_type: parsed.data.documentType,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      sent_to: parsed.data.sentToName,
      signer_name: parsed.data.sentToName,
      signer_email: parsed.data.sentToEmail,
      signer_phone: parsed.data.sentToPhone,
      sent_at: new Date().toISOString(),
      status: "sent",
      notes: parsed.data.notes ?? parsed.data.title,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Signature request could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_signature_request",
    entityType: "signature_request",
    entityId: data.id,
    newValues: { sentTo: parsed.data.sentToName, documentType: parsed.data.documentType },
  });

  revalidatePath("/documents");
}

export async function markSignatureRequestSigned(formData: FormData) {
  const workspace = await requireDocumentPermission(PERMISSIONS.MANAGE_SIGNATURE_REQUESTS);
  const signatureRequestId = formData.get("signatureRequestId");
  const signatureImage = formFile(formData.get("signatureImage"));
  const signedDocument = formFile(formData.get("signedDocument"));

  if (!signatureImage || !signedDocument) {
    return { error: "Upload both the signature image and signed document." };
  }

  const signatureImagePath = `${workspace.companyId}/signatures/${Date.now()}-${safeFileName(signatureImage.name)}`;
  const signedDocumentPath = `${workspace.companyId}/signed/${Date.now()}-${safeFileName(signedDocument.name)}`;
  const parsed = signDocumentSchema.safeParse({
    signatureRequestId,
    signedByName: formData.get("signedByName"),
    signatureImagePath,
    signedDocumentPath,
    ipAddress: formOptional(formData.get("ipAddress")),
    deviceInfo: formOptional(formData.get("deviceInfo")),
  });

  if (!parsed.success) {
    return { error: "Signed document details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data: request, error: requestError } = await supabase
    .from("signature_requests")
    .select("id, branch_id, document_id, request_number")
    .eq("id", parsed.data.signatureRequestId)
    .eq("company_id", workspace.companyId)
    .is("deleted_at", null)
    .single();

  if (requestError || !request) {
    return { error: "Signature request was not found." };
  }

  await uploadDocumentFile(signatureImage, signatureImagePath);
  await uploadDocumentFile(signedDocument, signedDocumentPath);

  const signedAt = new Date().toISOString();
  const { data: signedRow, error } = await supabase
    .from("signed_documents")
    .insert({
      company_id: workspace.companyId,
      branch_id: request.branch_id,
      signature_request_id: request.id,
      document_id: request.document_id,
      signed_document_number: makeDocumentNumber("SDOC"),
      storage_bucket: "documents",
      storage_path: signedDocumentPath,
      signed_by: parsed.data.signedByName,
      signed_at: signedAt,
      ip_address: parsed.data.ipAddress,
      device_info: parsed.data.deviceInfo,
      created_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !signedRow) {
    return { error: error?.message ?? "Signed document could not be archived." };
  }

  await supabase
    .from("signature_requests")
    .update({
      status: "signed",
      signed_at: signedAt,
      signed_by: parsed.data.signedByName,
      signature_storage_bucket: "documents",
      signature_storage_path: signatureImagePath,
      updated_by: workspace.profileId,
    })
    .eq("id", request.id)
    .eq("company_id", workspace.companyId);

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: request.branch_id,
    actorProfileId: workspace.profileId,
    action: "sign_document",
    entityType: "signature_request",
    entityId: request.id,
    newValues: { signedBy: parsed.data.signedByName, requestNumber: request.request_number },
  });

  revalidatePath("/documents");
}
