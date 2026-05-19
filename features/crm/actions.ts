"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createFollowUpSchema,
  createLeadSchema,
  leadIdSchema,
  logLeadMessageSchema,
  updateLeadStatusSchema,
} from "@/lib/validations/crm";

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return Number(value);
}

function formDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return new Date(value).toISOString();
}

async function getLeadForWorkspace(leadId: string, companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, company_id, branch_id, customer_id, assigned_salesperson_id")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error("Lead was not found.");
  }

  return data;
}

export async function createLead(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createLeadSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formData.get("branchId"),
    name: formData.get("name"),
    customerType: formData.get("customerType") || "individual",
    phone: formOptional(formData.get("phone")),
    whatsapp: formOptional(formData.get("whatsapp")),
    email: formOptional(formData.get("email")),
    countryCode: formOptional(formData.get("countryCode"))?.toUpperCase(),
    city: formOptional(formData.get("city")),
    preferredBrand: formOptional(formData.get("preferredBrand")),
    preferredModel: formOptional(formData.get("preferredModel")),
    budget: formNumber(formData.get("budget")),
    currencyCode: (formData.get("currencyCode") || "AED").toString().toUpperCase(),
    language: formData.get("language") || "en",
    leadSource: formData.get("leadSource") || "website",
    assignedSalespersonId: formOptional(formData.get("assignedSalespersonId")),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    throw new Error("Lead details are invalid.");
  }

  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_id: parsed.data.companyId,
      branch_id: parsed.data.branchId,
      name: parsed.data.name,
      customer_type: parsed.data.customerType,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
      email: parsed.data.email,
      country_code: parsed.data.countryCode,
      city: parsed.data.city,
      preferred_brand: parsed.data.preferredBrand,
      preferred_model: parsed.data.preferredModel,
      budget: parsed.data.budget,
      currency_code: parsed.data.currencyCode,
      language: parsed.data.language,
      lead_source: parsed.data.leadSource,
      assigned_salesperson_id: parsed.data.assignedSalespersonId,
      notes: parsed.data.notes,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !lead) {
    throw new Error(error?.message ?? "Lead could not be created.");
  }

  revalidatePath("/crm/leads");
  redirect(`/crm/leads/${lead.id}`);
}

export async function updateLeadStatus(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = updateLeadStatusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "Lead status is invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      status: parsed.data.status,
      updated_by: workspace.profileId,
    })
    .eq("id", parsed.data.leadId)
    .eq("company_id", workspace.companyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${parsed.data.leadId}`);
}

export async function createFollowUp(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const dueAt = formDateTime(formData.get("dueAt"));
  const parsed = createFollowUpSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    notes: formOptional(formData.get("notes")),
    dueAt,
    priority: formData.get("priority") || "normal",
    assignedTo: formOptional(formData.get("assignedTo")),
  });

  if (!parsed.success) {
    return { error: "Follow-up details are invalid." };
  }

  const lead = await getLeadForWorkspace(parsed.data.leadId, workspace.companyId);
  const supabase = await createClient();
  const { error } = await supabase.from("follow_ups").insert({
    company_id: workspace.companyId,
    branch_id: lead.branch_id,
    lead_id: lead.id,
    customer_id: lead.customer_id,
    assigned_to: parsed.data.assignedTo ?? lead.assigned_salesperson_id ?? workspace.profileId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    due_at: parsed.data.dueAt,
    priority: parsed.data.priority,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("leads")
    .update({
      next_follow_up_at: parsed.data.dueAt,
      updated_by: workspace.profileId,
    })
    .eq("id", lead.id)
    .eq("company_id", workspace.companyId);

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${lead.id}`);
}

export async function logLeadMessage(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = logLeadMessageSchema.safeParse({
    leadId: formData.get("leadId"),
    direction: formData.get("direction") || "internal",
    channel: formData.get("channel") || "internal",
    subject: formOptional(formData.get("subject")),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: "Message details are invalid." };
  }

  const lead = await getLeadForWorkspace(parsed.data.leadId, workspace.companyId);
  const supabase = await createClient();
  const messageAt = new Date().toISOString();
  const { error } = await supabase.from("lead_messages").insert({
    company_id: workspace.companyId,
    branch_id: lead.branch_id,
    lead_id: lead.id,
    customer_id: lead.customer_id,
    direction: parsed.data.direction,
    channel: parsed.data.channel,
    subject: parsed.data.subject,
    body: parsed.data.body,
    message_at: messageAt,
    created_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("leads")
    .update({
      last_contact_at: messageAt,
      updated_by: workspace.profileId,
    })
    .eq("id", lead.id)
    .eq("company_id", workspace.companyId);

  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${lead.id}`);
}

export async function archiveLead(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = leadIdSchema.safeParse({
    leadId: formData.get("leadId"),
  });

  if (!parsed.success) {
    throw new Error("Lead id is invalid.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: workspace.profileId,
    })
    .eq("id", parsed.data.leadId)
    .eq("company_id", workspace.companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm/leads");
  redirect("/crm/leads");
}

