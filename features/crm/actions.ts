"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentWorkspace, getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createCustomerSchema,
  createFollowUpSchema,
  createLeadSchema,
  leadIdSchema,
  logLeadMessageSchema,
  updateLeadStatusSchema,
  providerSchema,
  templateSchema,
  consentSchema,
  outboundMessageSchema,
} from "@/lib/validations/crm";
import {
  validateProviderConfig,
} from "@/lib/crm/communications";

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
    return { error: "Lead details are invalid." };
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
    return { error: error?.message ?? "Lead could not be created." };
  }

  revalidatePath("/crm/leads");
  return { leadId: lead.id, success: "Lead created." };
}

export async function createCustomer(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = createCustomerSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    customerType: formData.get("customerType") || "individual",
    name: formData.get("name"),
    phone: formOptional(formData.get("phone")),
    whatsapp: formOptional(formData.get("whatsapp")),
    email: formOptional(formData.get("email")),
    countryCode: formOptional(formData.get("countryCode"))?.toUpperCase(),
    city: formOptional(formData.get("city")),
    preferredLanguage: formData.get("preferredLanguage") || "en",
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    throw new Error("Customer details are invalid.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    company_id: parsed.data.companyId,
    branch_id: parsed.data.branchId,
    customer_type: parsed.data.customerType,
    name: parsed.data.name,
    phone: parsed.data.phone,
    whatsapp: parsed.data.whatsapp,
    email: parsed.data.email,
    country_code: parsed.data.countryCode,
    city: parsed.data.city,
    preferred_language: parsed.data.preferredLanguage,
    notes: parsed.data.notes,
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm/customers");
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
  return { success: "Follow-up created." };
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
  return { success: "Message logged." };
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

export async function upsertCommunicationProvider(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has("manage_communications")) {
    return { error: "Permission denied." };
  }

  const id = formOptional(formData.get("id"));
  const companyId = formData.get("companyId")?.toString();
  const branchId = formOptional(formData.get("branchId"));
  const providerType = formData.get("providerType")?.toString();
  const providerName = formData.get("providerName")?.toString();
  const configRaw = formData.get("config")?.toString() || "{}";
  const isActive = formData.get("isActive") === "true";

  let configObj: Record<string, unknown> = {};
  try {
    configObj = JSON.parse(configRaw);
  } catch {
    return { error: "Provider configuration JSON is invalid." };
  }

  const parsed = providerSchema.safeParse({
    id,
    companyId,
    branchId,
    providerType,
    providerName,
    config: configObj,
    isActive,
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Provider configuration is invalid." };
  }

  // Validate properties based on providerType
  if (!validateProviderConfig(parsed.data.providerType, parsed.data.config)) {
    return { error: `Invalid configuration fields for provider type: ${parsed.data.providerType}` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("communication_providers")
    .upsert({
      id: parsed.data.id || undefined,
      company_id: parsed.data.companyId,
      branch_id: parsed.data.branchId || null,
      provider_type: parsed.data.providerType,
      provider_name: parsed.data.providerName,
      config: parsed.data.config,
      is_active: parsed.data.isActive,
      updated_by: workspace.profileId,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/communication");
  return { success: "Provider configuration saved." };
}

export async function upsertMessageTemplate(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has("manage_communications")) {
    return { error: "Permission denied." };
  }

  const id = formOptional(formData.get("id"));
  const companyId = formData.get("companyId")?.toString();
  const name = formData.get("name")?.toString();
  const channel = formData.get("channel")?.toString();
  const subject = formOptional(formData.get("subject"));
  const body = formData.get("body")?.toString();
  const variablesRaw = formData.get("variables")?.toString() || "[]";
  const language = formData.get("language")?.toString() || "en";
  const isActive = formData.get("isActive") === "true";

  let variablesArr: string[] = [];
  try {
    variablesArr = JSON.parse(variablesRaw);
  } catch {
    return { error: "Variables format is invalid." };
  }

  const parsed = templateSchema.safeParse({
    id,
    companyId,
    name,
    channel,
    subject,
    body,
    variables: variablesArr,
    language,
    isActive,
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Template details are invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .upsert({
      id: parsed.data.id || undefined,
      company_id: parsed.data.companyId,
      name: parsed.data.name,
      channel: parsed.data.channel,
      subject: parsed.data.subject || null,
      body: parsed.data.body,
      variables: parsed.data.variables,
      language: parsed.data.language,
      is_active: parsed.data.isActive,
      updated_by: workspace.profileId,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/communication");
  return { success: "Message template saved." };
}

export async function updateCustomerConsent(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const companyId = formData.get("companyId")?.toString();
  const customerId = formOptional(formData.get("customerId"));
  const leadId = formOptional(formData.get("leadId"));
  const channel = formData.get("channel")?.toString();
  const isGranted = formData.get("isGranted") === "true";
  const consentSource = formData.get("consentSource")?.toString() || "ui";

  const parsed = consentSchema.safeParse({
    companyId,
    customerId,
    leadId,
    channel,
    isGranted,
    consentSource,
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Consent details are invalid." };
  }

  const supabase = await createClient();

  // Find if consent already exists to do update, or insert otherwise
  let findQuery = supabase
    .from("customer_consents")
    .select("id")
    .eq("company_id", workspace.companyId)
    .eq("channel", parsed.data.channel);

  if (parsed.data.customerId) {
    findQuery = findQuery.eq("customer_id", parsed.data.customerId);
  } else if (parsed.data.leadId) {
    findQuery = findQuery.eq("lead_id", parsed.data.leadId);
  } else {
    return { error: "Must specify customer or lead reference." };
  }

  const { data: existing, error: findError } = await findQuery;
  if (findError) {
    return { error: findError.message };
  }

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("customer_consents")
      .update({
        is_granted: parsed.data.isGranted,
        consent_source: parsed.data.consentSource,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);

    if (updateError) return { error: updateError.message };
  } else {
    const { error: insertError } = await supabase
      .from("customer_consents")
      .insert({
        company_id: workspace.companyId,
        customer_id: parsed.data.customerId || null,
        lead_id: parsed.data.leadId || null,
        channel: parsed.data.channel,
        is_granted: parsed.data.isGranted,
        consent_source: parsed.data.consentSource,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      });

    if (insertError) return { error: insertError.message };
  }

  if (parsed.data.leadId) {
    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
  }
  if (parsed.data.customerId) {
    revalidatePath(`/crm/customers/${parsed.data.customerId}`);
  }

  return { success: "Consent configuration updated." };
}

export async function createOutboundMessageDraft(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const companyId = formData.get("companyId")?.toString();
  const branchId = formData.get("branchId")?.toString() || "";
  const leadId = formOptional(formData.get("leadId"));
  const customerId = formOptional(formData.get("customerId"));
  const channel = formData.get("channel")?.toString();
  const recipientAddress = formData.get("recipientAddress")?.toString();
  const subject = formOptional(formData.get("subject"));
  const body = formData.get("body")?.toString();
  const templateId = formOptional(formData.get("templateId"));
  const variablesRaw = formData.get("templateVariables")?.toString() || "{}";

  let variablesObj: Record<string, unknown> = {};
  try {
    variablesObj = JSON.parse(variablesRaw);
  } catch {
    return { error: "Template variables format is invalid." };
  }

  const parsed = outboundMessageSchema.safeParse({
    companyId,
    branchId,
    leadId,
    customerId,
    channel,
    recipientAddress,
    subject,
    body,
    templateId,
    templateVariables: variablesObj,
    status: "draft",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Draft details are invalid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outbound_messages")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      lead_id: parsed.data.leadId || null,
      customer_id: parsed.data.customerId || null,
      channel: parsed.data.channel,
      recipient_address: parsed.data.recipientAddress,
      subject: parsed.data.subject || null,
      body: parsed.data.body,
      template_id: parsed.data.templateId || null,
      template_variables: parsed.data.templateVariables,
      status: "draft",
      sender_id: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to save message draft." };
  }

  if (parsed.data.leadId) {
    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
  }
  return { success: "Draft created successfully.", messageId: data.id };
}

export async function approveAndSendOutboundMessage(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const messageId = formData.get("messageId")?.toString();

  if (!messageId) {
    return { error: "Message reference is required." };
  }

  const supabase = await createClient();

  // Retrieve message detail
  const { data: message, error: fetchError } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("id", messageId)
    .eq("company_id", workspace.companyId)
    .single();

  if (fetchError || !message) {
    return { error: "Outbound message not found." };
  }

  // Update status to 'queued' to test consent trigger
  const { error: queueError } = await supabase
    .from("outbound_messages")
    .update({
      status: "queued",
      approved_by: workspace.profileId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (queueError) {
    // If the database trigger fails (consent not granted), the error is returned here
    return { error: queueError.message };
  }

  // Queue initial delivery event
  await supabase.from("message_delivery_events").insert({
    company_id: workspace.companyId,
    outbound_message_id: messageId,
    status: "queued",
    event_at: new Date().toISOString(),
  });

  // Simulating live network API request & provider webhook dispatch
  // We'll simulate immediate successful provider acknowledgment
  const externalMsgId = `ext-${Math.random().toString(36).substring(2, 10)}`;
  
  await supabase
    .from("outbound_messages")
    .update({
      status: "sent",
      external_message_id: externalMsgId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  await supabase.from("message_delivery_events").insert([
    {
      company_id: workspace.companyId,
      outbound_message_id: messageId,
      status: "sent",
      event_at: new Date().toISOString(),
    },
    {
      company_id: workspace.companyId,
      outbound_message_id: messageId,
      status: "delivered",
      event_at: new Date().toISOString(),
    },
    {
      company_id: workspace.companyId,
      outbound_message_id: messageId,
      status: "read",
      event_at: new Date().toISOString(),
    }
  ]);

  // Update final status to read
  await supabase
    .from("outbound_messages")
    .update({
      status: "read",
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  // Since it was successfully dispatched, replicate this in lead activity history logs (lead_messages)
  if (message.lead_id) {
    await supabase.from("lead_messages").insert({
      company_id: workspace.companyId,
      branch_id: message.branch_id,
      lead_id: message.lead_id,
      customer_id: message.customer_id || null,
      direction: "outbound",
      channel: message.channel,
      subject: message.subject,
      body: message.body,
      message_at: new Date().toISOString(),
      created_by: workspace.profileId,
    });

    // Also update lead's last contact time
    await supabase
      .from("leads")
      .update({
        last_contact_at: new Date().toISOString(),
        updated_by: workspace.profileId,
      })
      .eq("id", message.lead_id);

    revalidatePath(`/crm/leads/${message.lead_id}`);
  }

  return { success: "Message dispatched and acknowledged." };
}
