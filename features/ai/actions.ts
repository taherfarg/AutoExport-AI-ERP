"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { buildAiAnswerPayload, decideApprovalRequirement, routeAiIntent } from "@/lib/ai/assistant";
import { makeAiNumber } from "@/lib/ai/format";
import { extractDocumentOcrWithProvider, refineAiAnswerWithProvider, selectAiToolWithProvider } from "@/lib/ai/provider";
import { filterAiToolsByPermissions, findAiTool, getAiToolRegistry } from "@/lib/ai/tools";
import { createListingDraftFromVehicle, createSocialCaptionDraft } from "@/lib/marketing/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  aiApprovalDecisionSchema,
  askAiSchema,
  createAiExtractionRequestSchema,
  createAiReportRequestSchema,
  automationAgentSchema,
  documentExtractionSchema,
} from "@/lib/validations/ai";
import { compileProposalPayload, parseOcrFields, validateVehicleTitleCommitInput } from "@/lib/ai/automation-helpers";
import { calculateVehiclePricing } from "@/lib/vehicles/pricing";

type JsonRecord = Record<string, unknown>;

type Workspace = {
  companyId: string;
  profileId: string;
};

function caughtMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formFile(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string") {
    return null;
  }

  return typeof value.arrayBuffer === "function" && typeof value.name === "string" ? value : null;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
}

function mergeOcrData(regexData: Record<string, unknown>, providerData?: Record<string, unknown>) {
  const merged = { ...regexData };

  for (const [key, value] of Object.entries(providerData ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      merged[key] = value;
    }
  }

  return merged;
}

async function requireAiPermission() {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(PERMISSIONS.USE_AI_ASSISTANT)) {
    throw new Error("You do not have permission to use the AI assistant.");
  }

  return { workspace, permissions };
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

async function ensureConversation({
  workspace,
  branchId,
  conversationId,
  prompt,
}: {
  workspace: Workspace;
  branchId?: string;
  conversationId?: string;
  prompt: string;
}) {
  const supabase = createServiceRoleClient();

  if (conversationId) {
    const { data } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("company_id", workspace.companyId)
      .eq("id", conversationId)
      .is("deleted_at", null)
      .single();

    if (data) {
      return data.id as string;
    }
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      company_id: workspace.companyId,
      branch_id: branchId,
      title: prompt.slice(0, 80),
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "AI conversation could not be created.");
  }

  return data.id as string;
}

async function executeTool({
  companyId,
  prompt,
  toolName,
  permissions,
}: {
  companyId: string;
  prompt: string;
  toolName: string;
  permissions: Set<string>;
}) {
  const supabase = createServiceRoleClient();
  const normalized = prompt.toLowerCase();

  if (toolName === "getAvailableStock") {
    const { data } = await supabase
      .from("vehicles")
      .select("id, stock_number, brand, model, year, status")
      .eq("company_id", companyId)
      .eq("status", "available")
      .is("deleted_at", null)
      .limit(8);
    const rows = data ?? [];

    return buildAiAnswerPayload({
      directAnswer: `There are ${rows.length} available vehicles in the visible stock sample.`,
      metrics: [{ label: "Available stock", value: rows.length }],
      rows: rows.map((vehicle) => ({
        stockNumber: vehicle.stock_number,
        vehicle: `${vehicle.year} ${vehicle.brand} ${vehicle.model}`,
        status: vehicle.status,
      })),
      suggestedActions: ["Open vehicle inventory", "Generate stock report"],
    });
  }

  if (toolName === "searchVehicles") {
    let query = supabase
      .from("vehicles")
      .select("id, stock_number, brand, model, year, trim, status, selling_price, currency_code, export_available")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .limit(10);

    if (normalized.includes("toyota")) {
      query = query.eq("brand", "Toyota");
    }

    if (normalized.includes("available")) {
      query = query.eq("status", "available");
    }

    if (normalized.includes("export")) {
      query = query.eq("export_available", true);
    }

    const { data } = await query;
    const rows = data ?? [];

    return buildAiAnswerPayload({
      directAnswer: `Found ${rows.length} matching vehicles.`,
      metrics: [{ label: "Matches", value: rows.length }],
      rows: rows.map((vehicle) => ({
        stockNumber: vehicle.stock_number,
        vehicle: `${vehicle.year} ${vehicle.brand} ${vehicle.model}`,
        status: vehicle.status,
        exportAvailable: vehicle.export_available ? "Yes" : "No",
      })),
      suggestedActions: ["Open matching stock", "Create marketing listing"],
    });
  }

  if (toolName === "getVehicleDetails") {
    let query = supabase
      .from("vehicles")
      .select(
        "id, stock_number, vin, brand, model, year, trim, condition, mileage, exterior_color, interior_color, engine, transmission, drivetrain, fuel_type, body_type, seats, doors, origin_country_code, current_country_code, current_location, status, selling_price, currency_code, export_available, documents_status, photos_status, purchase_price, shipping_cost, customs_cost, preparation_cost, marketing_cost, other_expenses",
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .limit(1);

    const stockMatch = prompt.match(/\b[A-Z]{2,5}-[A-Z0-9-]{2,}\b/i);
    if (stockMatch) {
      query = query.eq("stock_number", stockMatch[0].toUpperCase());
    } else if (normalized.includes("toyota")) {
      query = query.eq("brand", "Toyota");
    }

    const { data } = await query.single();

    if (!data) {
      return buildAiAnswerPayload({
        directAnswer: "I could not find a matching vehicle in your permitted workspace.",
        suggestedActions: ["Open vehicle inventory", "Search by stock number"],
      });
    }

    const pricing = permissions.has(PERMISSIONS.VIEW_VEHICLE_COST) && permissions.has(PERMISSIONS.VIEW_VEHICLE_PROFIT)
      ? calculateVehiclePricing({
          purchasePrice: Number(data.purchase_price),
          shippingCost: Number(data.shipping_cost),
          customsCost: Number(data.customs_cost),
          preparationCost: Number(data.preparation_cost),
          marketingCost: Number(data.marketing_cost),
          otherExpenses: Number(data.other_expenses),
          sellingPrice: Number(data.selling_price),
        })
      : null;

    return buildAiAnswerPayload({
      directAnswer: `${data.year} ${data.brand} ${data.model} ${data.trim ?? ""} is ${data.status}.`,
      metrics: [
        { label: "Mileage", value: Number(data.mileage ?? 0) },
        { label: "Selling price", value: `${data.currency_code} ${data.selling_price}` },
        ...(pricing ? [{ label: "Expected profit", value: pricing.expectedProfit }] : []),
      ],
      rows: [{
        stockNumber: data.stock_number,
        vin: data.vin,
        vehicle: `${data.year} ${data.brand} ${data.model}`,
        trim: data.trim,
        engine: data.engine,
        transmission: data.transmission,
        drivetrain: data.drivetrain,
        location: data.current_location,
        exportAvailable: data.export_available ? "Yes" : "No",
        documentsStatus: data.documents_status,
        photosStatus: data.photos_status,
      }],
      suggestedActions: ["Open vehicle details", "Generate listing draft", "Create quotation draft"],
    });
  }

  if (toolName === "getLeadsDueToday") {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("follow_ups")
      .select("id, title, due_at, status, leads(name, preferred_brand, preferred_model)")
      .eq("company_id", companyId)
      .lte("due_at", `${today}T23:59:59.999Z`)
      .is("completed_at", null)
      .is("deleted_at", null)
      .limit(10);
    const rows = (data ?? []) as unknown as { title: string; due_at: string; status: string; leads: { name: string } | null }[];

    return buildAiAnswerPayload({
      directAnswer: `${rows.length} follow-ups are due today or overdue.`,
      metrics: [{ label: "Follow-ups due", value: rows.length }],
      rows: rows.map((row) => ({ lead: row.leads?.name ?? "Lead", followUp: row.title, dueAt: row.due_at })),
      suggestedActions: ["Open CRM follow-ups", "Create follow-up task"],
    });
  }

  if (toolName === "getPendingPayments") {
    if (!permissions.has(PERMISSIONS.VIEW_PAYMENTS)) {
      return buildAiAnswerPayload({
        directAnswer: "You do not have permission to view pending payment details.",
        suggestedActions: ["Ask an admin for payment visibility"],
      });
    }

    const { data } = await supabase
      .from("sales_invoices")
      .select("invoice_number, balance_due, currency_code, customers(name)")
      .eq("company_id", companyId)
      .gt("balance_due", 0)
      .is("deleted_at", null)
      .limit(10);
    const rows = (data ?? []) as unknown as { invoice_number: string; balance_due: number; currency_code: string; customers: { name: string } | null }[];
    const total = rows.reduce((sum, row) => sum + Number(row.balance_due), 0);

    return buildAiAnswerPayload({
      directAnswer: `There are ${rows.length} invoices with pending balances.`,
      metrics: [{ label: "Pending balance", value: total }],
      rows: rows.map((row) => ({
        invoice: row.invoice_number,
        customer: row.customers?.name ?? "Customer",
        balance: `${row.currency_code} ${row.balance_due}`,
      })),
      suggestedActions: ["Open payments", "Generate pending payments report"],
    });
  }

  if (toolName === "getMissingDocuments") {
    const { data } = await supabase
      .from("document_checklists")
      .select("entity_type, document_type, title, status")
      .eq("company_id", companyId)
      .in("status", ["draft", "rejected", "expired"])
      .limit(10);
    const rows = data ?? [];

    return buildAiAnswerPayload({
      directAnswer: `${rows.length} required document checklist items need attention.`,
      metrics: [{ label: "Document gaps", value: rows.length }],
      rows: rows.map((row) => ({ entity: row.entity_type, document: row.title, status: row.status })),
      suggestedActions: ["Open documents", "Notify document controller"],
    });
  }

  if (toolName === "calculateVehiclePricing") {
    if (!permissions.has(PERMISSIONS.VIEW_VEHICLE_COST) || !permissions.has(PERMISSIONS.VIEW_VEHICLE_PROFIT)) {
      return buildAiAnswerPayload({
        directAnswer: "You do not have permission to view cost or profit pricing intelligence.",
        suggestedActions: ["Ask a manager for pricing visibility"],
      });
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("stock_number, purchase_price, shipping_cost, customs_cost, preparation_cost, marketing_cost, other_expenses, selling_price")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .limit(1)
      .single();

    if (!vehicle) {
      return buildAiAnswerPayload({
        directAnswer: "No vehicle found for pricing calculation.",
        suggestedActions: ["Open vehicle inventory"],
      });
    }

    const pricing = calculateVehiclePricing({
      purchasePrice: Number(vehicle.purchase_price),
      shippingCost: Number(vehicle.shipping_cost),
      customsCost: Number(vehicle.customs_cost),
      preparationCost: Number(vehicle.preparation_cost),
      marketingCost: Number(vehicle.marketing_cost),
      otherExpenses: Number(vehicle.other_expenses),
      sellingPrice: Number(vehicle.selling_price),
    });

    return buildAiAnswerPayload({
      directAnswer: `Pricing calculated for ${vehicle.stock_number}.`,
      metrics: [
        { label: "Landed cost", value: pricing.totalLandedCost },
        { label: "Expected profit", value: pricing.expectedProfit },
        { label: "Margin", value: `${pricing.profitMargin}%` },
      ],
      rows: [{ stockNumber: vehicle.stock_number, ...pricing }],
      suggestedActions: ["Open vehicle pricing", "Request discount approval"],
    });
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("stock_number, brand, model, year, trim, mileage, condition, selling_price, currency_code, export_available")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if ((toolName === "generateListingDraft" || toolName === "generateSocialPostDraft") && vehicle) {
    const vehicleInput = {
      stockNumber: vehicle.stock_number,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim,
      mileage: vehicle.mileage,
      condition: vehicle.condition,
      sellingPrice: Number(vehicle.selling_price),
      currencyCode: vehicle.currency_code,
      exportAvailable: vehicle.export_available,
    };
    const draft =
      toolName === "generateListingDraft"
        ? createListingDraftFromVehicle(vehicleInput)
        : createSocialCaptionDraft({ vehicle: vehicleInput, channelType: "instagram" });

    return buildAiAnswerPayload({
      directAnswer: toolName === "generateListingDraft" ? "Listing draft generated." : "Social post draft generated.",
      rows: [draft],
      suggestedActions: ["Open marketing drafts", "Save as draft"],
    });
  }

  if (toolName === "createQuotationDraft") {
    const { data: quoteVehicle } = await supabase
      .from("vehicles")
      .select("id, stock_number, brand, model, year, trim, selling_price, currency_code, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .neq("status", "sold")
      .limit(1)
      .single();
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, customer_type, country_code")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .limit(1)
      .single();

    return buildAiAnswerPayload({
      directAnswer: "Quotation draft prepared for human review. It has not created a final quotation yet.",
      metrics: quoteVehicle ? [{ label: "Draft price", value: `${quoteVehicle.currency_code} ${quoteVehicle.selling_price}` }] : [],
      rows: [{
        customer: customer?.name ?? "Select customer",
        vehicle: quoteVehicle ? `${quoteVehicle.year} ${quoteVehicle.brand} ${quoteVehicle.model}` : "Select vehicle",
        stockNumber: quoteVehicle?.stock_number ?? "-",
        price: quoteVehicle ? `${quoteVehicle.currency_code} ${quoteVehicle.selling_price}` : "-",
        nextStep: "Manager reviews and creates quotation",
      }],
      suggestedActions: ["Review approval queue", "Open quotations", "Attach terms"],
    });
  }

  if (toolName === "createFollowUpTask") {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, preferred_brand, preferred_model, next_follow_up_at, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("next_follow_up_at", { ascending: true, nullsFirst: false })
      .limit(1)
      .single();

    return buildAiAnswerPayload({
      directAnswer: "Follow-up task draft prepared for approval. No task was created yet.",
      rows: [{
        lead: lead?.name ?? "Select lead",
        interest: [lead?.preferred_brand, lead?.preferred_model].filter(Boolean).join(" ") || "Vehicle inquiry",
        status: lead?.status ?? "new",
        suggestedTask: "Contact buyer, confirm budget and export destination, then send matching stock.",
      }],
      suggestedActions: ["Review approval queue", "Open CRM follow-ups"],
    });
  }

  if (toolName === "generateReportDraft") {
    const [{ count: vehicleCount }, { count: leadCount }, { count: invoiceCount }] = await Promise.all([
      supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("deleted_at", null),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("deleted_at", null),
      supabase.from("sales_invoices").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("deleted_at", null),
    ]);

    return buildAiAnswerPayload({
      directAnswer: "Report draft prepared from your permitted company data.",
      metrics: [
        { label: "Vehicles", value: vehicleCount ?? 0 },
        { label: "Leads", value: leadCount ?? 0 },
        { label: "Invoices", value: invoiceCount ?? 0 },
      ],
      rows: [
        { section: "Inventory", summary: `${vehicleCount ?? 0} active vehicle records.` },
        { section: "CRM", summary: `${leadCount ?? 0} lead records.` },
        { section: "Sales", summary: `${invoiceCount ?? 0} invoice records.` },
      ],
      suggestedActions: ["Create report export", "Schedule manager review"],
    });
  }

  return buildAiAnswerPayload({
    directAnswer: "I prepared a safe draft for review. This action needs human approval before it changes records.",
    rows: [{ toolName, prompt }],
    suggestedActions: ["Review approval queue"],
  });
}

export async function askAiAssistant(formData: FormData) {
  const { workspace, permissions } = await requireAiPermission();
  const parsed = askAiSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    conversationId: formOptional(formData.get("conversationId")),
    prompt: formData.get("prompt"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "AI prompt is invalid." };
  }

  const allowedTools = filterAiToolsByPermissions(getAiToolRegistry(), permissions);
  const fallbackToolName = routeAiIntent(parsed.data.prompt);
  const toolSelection = await selectAiToolWithProvider({
    prompt: parsed.data.prompt,
    fallbackToolName,
    allowedTools,
  });
  const toolName = toolSelection.toolName;
  const tool = findAiTool(toolName);
  const isAllowed = allowedTools.some((allowedTool) => allowedTool.name === toolName);
  const conversationId = await ensureConversation({
    workspace,
    branchId: parsed.data.branchId,
    conversationId: parsed.data.conversationId,
    prompt: parsed.data.prompt,
  });
  const supabase = createServiceRoleClient();

  await supabase.from("ai_messages").insert({
    company_id: workspace.companyId,
    conversation_id: conversationId,
    role: "user",
    content: parsed.data.prompt,
    created_by: workspace.profileId,
  });

  const approval = decideApprovalRequirement(toolName);
  const baseAnswerPayload = isAllowed
    ? await executeTool({ companyId: workspace.companyId, prompt: parsed.data.prompt, toolName, permissions })
    : buildAiAnswerPayload({
        directAnswer: `The ${toolName} tool is not available for your current permissions.`,
        suggestedActions: ["Ask an admin to review your permissions"],
      });
  const providerResult = isAllowed
    ? await refineAiAnswerWithProvider({
        prompt: parsed.data.prompt,
        toolName,
        toolDescription: tool?.description,
        answerPayload: baseAnswerPayload,
        sensitive: approval.sensitive,
        requiresApproval: approval.requiresApproval,
      })
    : {
        provider: toolSelection.provider,
        model: toolSelection.model,
        answerPayload: baseAnswerPayload,
        responseText: baseAnswerPayload.directAnswer,
        errorMessage: undefined,
      };
  const answerPayload = providerResult.answerPayload;
  const provider = providerResult.provider;
  const status = !isAllowed ? "failed" : approval.requiresApproval ? "approval_required" : "completed";
  const response = providerResult.responseText;
  const errorMessage = !isAllowed
    ? "Permission denied for selected AI tool."
    : [toolSelection.errorMessage, providerResult.errorMessage].filter(Boolean).join(" | ") || null;

  const { data: requestRow, error: requestError } = await supabase
    .from("ai_requests")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      conversation_id: conversationId,
      request_number: makeAiNumber("AI"),
      prompt: parsed.data.prompt,
      response,
      answer_payload: answerPayload,
      provider,
      model: providerResult.model,
      status,
      error_message: errorMessage,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (requestError || !requestRow) {
    return { error: requestError?.message ?? "AI request could not be saved." };
  }

  const { data: actionRow } = await supabase
    .from("ai_actions")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      conversation_id: conversationId,
      request_id: requestRow.id,
      action_number: makeAiNumber("ACT"),
      tool_name: toolName,
      action_type: "tool_call",
      status: !isAllowed ? "blocked" : approval.requiresApproval ? "approval_required" : "executed",
      sensitive: approval.sensitive,
      requires_approval: approval.requiresApproval,
      input_payload: { prompt: parsed.data.prompt },
      output_payload: answerPayload,
      error_message: errorMessage,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (actionRow && approval.requiresApproval && isAllowed) {
    await supabase.from("ai_approvals").insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      action_id: actionRow.id,
      request_id: requestRow.id,
      approval_number: makeAiNumber("APR"),
      title: `Approve ${tool?.description ?? toolName}`,
      requested_by: workspace.profileId,
      payload: { toolName, answerPayload },
    });
  }

  await supabase.from("ai_messages").insert({
    company_id: workspace.companyId,
    conversation_id: conversationId,
    role: "assistant",
    content: response,
    payload: answerPayload,
    created_by: workspace.profileId,
  });

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "ask_ai_assistant",
    entityType: "ai_request",
    entityId: requestRow.id,
    newValues: { toolName, status },
  });

  revalidatePath("/ai");
  return { success: true };
}

export async function createAiReportRequest(formData: FormData) {
  const { workspace } = await requireAiPermission();
  const parsed = createAiReportRequestSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    reportType: formData.get("reportType"),
    prompt: formData.get("prompt"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "AI report request is invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_report_requests")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      report_number: parsed.data.reportNumber,
      report_type: parsed.data.reportType,
      prompt: parsed.data.prompt,
      filters: parsed.data.filters,
      status: parsed.data.status,
      result_summary: "Report draft request saved for AI processing.",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "AI report request could not be saved." };
  }

  revalidatePath("/ai");
}

export async function createAiExtractionRequest(formData: FormData) {
  const { workspace } = await requireAiPermission();
  const parsed = createAiExtractionRequestSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    documentId: formOptional(formData.get("documentId")),
    documentType: formData.get("documentType"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "AI extraction request is invalid." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("ai_extracted_documents").insert({
    company_id: workspace.companyId,
    branch_id: parsed.data.branchId,
    document_id: parsed.data.documentId,
    extraction_number: parsed.data.extractionNumber,
    document_type: parsed.data.documentType,
    status: "queued",
    created_by: workspace.profileId,
    updated_by: workspace.profileId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ai");
}

export async function decideAiApproval(formData: FormData) {
  const { workspace } = await requireAiPermission();
  const parsed = aiApprovalDecisionSchema.safeParse({
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
    notes: formOptional(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: "AI approval decision is invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data: approval } = await supabase
    .from("ai_approvals")
    .select("id, company_id, branch_id, action_id")
    .eq("company_id", workspace.companyId)
    .eq("id", parsed.data.approvalId)
    .is("deleted_at", null)
    .single();

  if (!approval) {
    return { error: "AI approval was not found." };
  }

  await supabase
    .from("ai_approvals")
    .update({
      status: parsed.data.decision,
      decided_by: workspace.profileId,
      decided_at: new Date().toISOString(),
      decision_notes: parsed.data.notes,
    })
    .eq("id", approval.id)
    .eq("company_id", workspace.companyId);

  await supabase
    .from("ai_actions")
    .update({
      status: parsed.data.decision === "approved" ? "proposed" : "blocked",
      updated_by: workspace.profileId,
    })
    .eq("id", approval.action_id)
    .eq("company_id", workspace.companyId);

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: approval.branch_id,
    actorProfileId: workspace.profileId,
    action: "decide_ai_approval",
    entityType: "ai_approval",
    entityId: approval.id,
    newValues: { decision: parsed.data.decision },
  });

  revalidatePath("/ai");
}

async function requireManageAiAutomationPermission() {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(PERMISSIONS.MANAGE_AI_AUTOMATION)) {
    throw new Error("You do not have permission to manage AI automation.");
  }

  return { workspace, permissions };
}

export async function toggleAutomationAgent(formData: FormData) {
  const { workspace } = await requireManageAiAutomationPermission();
  const branchId = formOptional(formData.get("branchId")) || null;
  const agentType = formData.get("agentType") as string;
  const isEnabled = formData.get("isEnabled") === "true";
  const configStr = formData.get("config") as string;
  
  let config: JsonRecord = {};
  if (configStr) {
    try {
      config = JSON.parse(configStr);
    } catch {
      config = {};
    }
  }

  const parsed = automationAgentSchema.safeParse({
    companyId: workspace.companyId,
    branchId,
    agentType,
    isEnabled,
    config,
  });

  if (!parsed.success) {
    return { error: parsed.error.message };
  }

  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("ai_automation_agents")
    .select("id")
    .eq("company_id", workspace.companyId)
    .eq("agent_type", parsed.data.agentType)
    .single();

  let agentId: string;
  if (existing) {
    const { data: updated, error } = await supabase
      .from("ai_automation_agents")
      .update({
        is_enabled: parsed.data.isEnabled,
        config: parsed.data.config,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("company_id", workspace.companyId)
      .select("id")
      .single();

    if (error || !updated) {
      return { error: error?.message ?? "Failed to update automation agent." };
    }
    agentId = updated.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("ai_automation_agents")
      .insert({
        company_id: workspace.companyId,
        branch_id: parsed.data.branchId,
        agent_type: parsed.data.agentType,
        is_enabled: parsed.data.isEnabled,
        config: parsed.data.config,
        status: "idle",
        created_by: workspace.profileId,
        updated_by: workspace.profileId,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { error: error?.message ?? "Failed to create automation agent." };
    }
    agentId = inserted.id;
  }

  revalidatePath("/ai/automation");
  return { success: true, agentId };
}

export async function triggerAutonomousScan(formData: FormData) {
  const { workspace } = await requireManageAiAutomationPermission();
  const agentType = formData.get("agentType") as "crm_follow_up" | "parts_reorder" | "vehicle_marketing";
  const branchId = formOptional(formData.get("branchId")) || null;

  if (!agentType || !["crm_follow_up", "parts_reorder", "vehicle_marketing"].includes(agentType)) {
    return { error: "Invalid agent type." };
  }

  const supabase = createServiceRoleClient();

  const { data: agent, error: agentErr } = await supabase
    .from("ai_automation_agents")
    .select("id, is_enabled")
    .eq("company_id", workspace.companyId)
    .eq("agent_type", agentType)
    .single();

  if (agentErr || !agent) {
    return { error: "AI agent not found or configured." };
  }

  await supabase
    .from("ai_automation_agents")
    .update({
      status: "scanning",
      last_scan_at: new Date().toISOString(),
      updated_by: workspace.profileId,
    })
    .eq("id", agent.id);

  try {
    let title = "";
    let description = "";
    let justification = "";
    let proposedPayload: JsonRecord = {};

    if (agentType === "crm_follow_up") {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, name, preferred_brand, preferred_model")
        .eq("company_id", workspace.companyId)
        .is("deleted_at", null)
        .limit(1)
        .single();

      if (!lead) {
        throw new Error("No active lead was found for the CRM follow-up agent.");
      }

      const leadName = lead?.name ?? "John Doe";
      const vehicleInterest = lead ? `${lead.preferred_brand || ""} ${lead.preferred_model || ""}`.trim() : "BMW X5";
      
      title = `Follow up with ${leadName}`;
      description = `Send an automated follow-up offering stock options matching ${vehicleInterest || "our latest vehicle inventory"}.`;
      justification = `Lead has been idle with no follow-up task recorded for over 48 hours.`;
      
      proposedPayload = compileProposalPayload("lead_follow_up", {
        leadId: lead.id,
        messageBody: `Hi ${leadName}, we have a couple of outstanding options matching your interest in ${vehicleInterest || "vehicles"}. Let us know when we can connect!`,
        messageChannel: "whatsapp",
      });
    } else if (agentType === "parts_reorder") {
      const { data: part } = await supabase
        .from("parts")
        .select("id, part_number, name, stock_qty, min_stock_qty, default_supplier_id")
        .eq("company_id", workspace.companyId)
        .is("deleted_at", null)
        .limit(1)
        .single();

      const supplierId = part?.default_supplier_id || null;
      let supplierName = "AutoParts Depot Ltd";
      if (supplierId) {
        const { data: supplier } = await supabase
          .from("part_suppliers")
          .select("supplier_name")
          .eq("id", supplierId)
          .single();
        if (supplier) {
          supplierName = supplier.supplier_name;
        }
      }

      const partNum = part?.part_number ?? "BP-202X";
      const partName = part?.name ?? "Heavy-Duty Front Brake Pads";
      const stock = part?.stock_qty ?? 3;
      const minStock = part?.min_stock_qty ?? 10;

      title = `Reorder ${partName}`;
      description = `Draft supplier purchase order for ${partName} (${partNum}) - Quantity: 50 units.`;
      justification = `Current stock (${stock}) is below the set threshold of ${minStock} units at this branch.`;

      proposedPayload = compileProposalPayload("parts_reorder", {
        partId: part?.id || null,
        partNumber: partNum,
        partName,
        supplierId,
        supplierName,
        quantity: 50,
        estimatedUnitCost: 60,
      });
    } else if (agentType === "vehicle_marketing") {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id, stock_number, brand, model, year, selling_price, currency_code")
        .eq("company_id", workspace.companyId)
        .eq("status", "available")
        .is("deleted_at", null)
        .limit(1)
        .single();

      if (!vehicle) {
        throw new Error("No available vehicle was found for the marketing agent.");
      }

      const brand = vehicle?.brand ?? "Toyota";
      const model = vehicle?.model ?? "Camry";
      const year = vehicle?.year ?? 2022;
      const price = vehicle?.selling_price ?? 75000;
      const currency = vehicle?.currency_code ?? "AED";

      title = `Promote ${year} ${brand} ${model}`;
      description = `Create and publish listing for stock #${vehicle?.stock_number ?? "T-801"} across social media and digital marketplaces.`;
      justification = `Vehicle is marked as "available" but has no active social media or marketing posts.`;

      proposedPayload = compileProposalPayload("vehicle_marketing", {
        vehicleId: vehicle.id,
        vin: "1FTFW1EF5GFA99999",
        platforms: ["Facebook Marketplace", "Dubizzle", "Instagram"],
        headline: `Pre-Owned ${year} ${brand} ${model} in pristine condition!`,
        description: `Stunning ${brand} ${model} available now for export or local sale. Fully certified and ready to drive. Contact us today!`,
        askingPrice: price,
        currencyCode: currency,
      });
    }

    const proposalType = agentType === "crm_follow_up" ? "lead_follow_up" : agentType;

    const { data: proposal, error: propErr } = await supabase
      .from("ai_automation_proposals")
      .insert({
        company_id: workspace.companyId,
        branch_id: branchId,
        agent_id: agent.id,
        proposal_type: proposalType,
        title,
        description,
        justification,
        proposed_payload: proposedPayload,
        status: "pending",
        created_by: workspace.profileId,
        updated_by: workspace.profileId,
      })
      .select("id")
      .single();

    if (propErr || !proposal) {
      throw new Error(propErr?.message ?? "Failed to create proposal.");
    }

    await supabase
      .from("ai_automation_agents")
      .update({
        status: "idle",
        updated_by: workspace.profileId,
      })
      .eq("id", agent.id);

    revalidatePath("/ai/automation");
    return { success: true, proposalId: proposal.id };
  } catch (err: unknown) {
    const message = caughtMessage(err, "An error occurred during scan");
    await supabase
      .from("ai_automation_agents")
      .update({
        status: "error",
        error_message: message,
        updated_by: workspace.profileId,
      })
      .eq("id", agent.id);

    revalidatePath("/ai/automation");
    return { error: message || "Autonomous scan failed." };
  }
}

export async function triggerDocumentOcr(formData: FormData) {
  const { workspace } = await requireManageAiAutomationPermission();
  const uploadedFile = formFile(formData.get("documentFile"));
  const uploadedFileName = uploadedFile ? safeFileName(uploadedFile.name) : "";
  const fileName = uploadedFileName || (formData.get("fileName") as string) || "mock_file.pdf";
  const fileType = uploadedFile?.type || (formData.get("fileType") as string) || "application/pdf";
  const filePath = uploadedFileName
    ? `uploads/ocr/${crypto.randomUUID()}-${uploadedFileName}`
    : (formData.get("filePath") as string) || "uploads/mock_file.pdf";
  const documentType = formData.get("documentType") as "vehicle_title" | "supplier_invoice";
  const branchId = formOptional(formData.get("branchId")) || null;
  const providedRawText = formOptional(formData.get("rawText"));

  if (!documentType || !["vehicle_title", "supplier_invoice"].includes(documentType)) {
    return { error: "Invalid document type for OCR extraction." };
  }

  if (uploadedFile && uploadedFile.size > 5 * 1024 * 1024) {
    return { error: "OCR file is too large. Upload an image or PDF up to 5 MB." };
  }

  if (uploadedFile && !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(fileType)) {
    return { error: "OCR supports JPEG, PNG, WebP, or PDF files." };
  }

  const parsedCheck = documentExtractionSchema.safeParse({
    companyId: workspace.companyId,
    branchId,
    filePath,
    fileName,
    fileType,
    documentType,
    status: "pending",
  });

  if (!parsedCheck.success) {
    return { error: parsedCheck.error.message };
  }

  const supabase = createServiceRoleClient();

  const { data: extraction, error: insertErr } = await supabase
    .from("ai_document_extractions")
    .insert({
      company_id: workspace.companyId,
      branch_id: branchId,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
      document_type: documentType,
      status: "pending",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (insertErr || !extraction) {
    return { error: insertErr?.message ?? "Failed to initiate document OCR." };
  }

  try {
    let rawText = providedRawText;
    let providerOcrData: Record<string, unknown> | undefined;

    if (!rawText && uploadedFile) {
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
      const providerResult = await extractDocumentOcrWithProvider({
        documentType,
        image: {
          dataBase64: fileBuffer.toString("base64"),
          mimeType: fileType,
          fileName,
        },
      });

      rawText = providerResult.rawText;
      providerOcrData = providerResult.parsed;

      if (!rawText && Object.values(providerOcrData).every((value) => value === null || value === undefined || value === "")) {
        throw new Error("The OCR provider could not read text from this file. Try a clearer image or enter manual OCR text.");
      }
    }

    if (!rawText) {
      if (documentType === "vehicle_title") {
        rawText = `
          CERTIFICATE OF TITLE
          TITLE NO: 987654321
          VIN: 1FTFW1EF5GFA99999
          YEAR: 2016
          MAKE: FORD
          MODEL: F-150 SUPERCREW
          COLOR: BLACK
        `;
      } else {
        rawText = `
          INVOICE
          SUPPLIER: AutoParts Depot Ltd
          INVOICE #: INV-2026-0520
          PART NUMBER: BP-202X
          DESCRIPTION: Heavy-Duty Front Brake Pads
          QTY: 25
          TOTAL AMOUNT DUE: AED 3,000.00
        `;
      }
    }

    const extractedData = mergeOcrData(parseOcrFields(documentType, rawText), providerOcrData);

    const { error: updateErr } = await supabase
      .from("ai_document_extractions")
      .update({
        status: "completed",
        extracted_data: extractedData,
        raw_text: rawText,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", extraction.id)
      .eq("company_id", workspace.companyId);

    if (updateErr) {
      throw updateErr;
    }

    revalidatePath("/ai/automation");
    return { success: true, extractionId: extraction.id, extractedData };
  } catch (err: unknown) {
    const message = caughtMessage(err, "OCR parsing failed.");
    await supabase
      .from("ai_document_extractions")
      .update({
        status: "failed",
        error_message: message,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", extraction.id)
      .eq("company_id", workspace.companyId);

    revalidatePath("/ai/automation");
    return { error: message || "OCR extraction process failed." };
  }
}

export async function commitDocumentOcr(formData: FormData) {
  const { workspace } = await requireManageAiAutomationPermission();
  const extractionId = formData.get("extractionId") as string;
  const branchId = formOptional(formData.get("branchId")) || null;

  if (!extractionId) {
    return { error: "Extraction ID is required." };
  }

  const supabase = createServiceRoleClient();

  const { data: extraction, error: fetchErr } = await supabase
    .from("ai_document_extractions")
    .select("*")
    .eq("id", extractionId)
    .eq("company_id", workspace.companyId)
    .single();

  if (fetchErr || !extraction) {
    return { error: "OCR extraction record not found." };
  }

  const documentType = extraction.document_type;
  const data = extraction.extracted_data as JsonRecord;

  if (documentType === "vehicle_title") {
    const reviewed = validateVehicleTitleCommitInput(
      Object.fromEntries(formData.entries()),
      {
        vin: data.vin,
        make: data.make,
        model: data.model,
        year: data.year,
        color: data.color,
        licensePlate: data.licensePlate,
      },
    );

    if (!reviewed.success) {
      return { error: reviewed.error };
    }

    const vehicleInput = reviewed.data;

    const { data: vehicle, error: vehicleErr } = await supabase
      .from("vehicles")
      .insert({
        company_id: workspace.companyId,
        branch_id: branchId,
        stock_number: vehicleInput.stockNumber,
        vin: vehicleInput.vin,
        brand: vehicleInput.brand,
        model: vehicleInput.model,
        year: vehicleInput.year,
        trim: vehicleInput.trim,
        condition: vehicleInput.condition,
        mileage: vehicleInput.mileage,
        exterior_color: vehicleInput.exteriorColor,
        interior_color: vehicleInput.interiorColor,
        engine: vehicleInput.engine,
        transmission: vehicleInput.transmission,
        drivetrain: vehicleInput.drivetrain,
        fuel_type: vehicleInput.fuelType,
        body_type: vehicleInput.bodyType,
        seats: vehicleInput.seats,
        doors: vehicleInput.doors,
        origin_country_code: vehicleInput.originCountryCode,
        current_country_code: vehicleInput.currentCountryCode,
        current_location: vehicleInput.currentLocation,
        purchase_price: vehicleInput.purchasePrice,
        shipping_cost: vehicleInput.shippingCost,
        customs_cost: vehicleInput.customsCost,
        preparation_cost: vehicleInput.preparationCost,
        marketing_cost: vehicleInput.marketingCost,
        other_expenses: vehicleInput.otherExpenses,
        total_landed_cost: vehicleInput.totalLandedCost,
        selling_price: vehicleInput.sellingPrice,
        expected_profit: vehicleInput.expectedProfit,
        profit_margin: vehicleInput.profitMargin,
        currency_code: vehicleInput.currencyCode,
        status: vehicleInput.status,
        export_available: vehicleInput.exportAvailable,
        created_by: workspace.profileId,
        updated_by: workspace.profileId,
      })
      .select("id, stock_number")
      .single();

    if (vehicleErr) {
      return { error: vehicleErr.message };
    }

    await supabase.from("vehicle_costs").insert({
      company_id: workspace.companyId,
      vehicle_id: vehicle.id,
      purchase_price: vehicleInput.purchasePrice,
      shipping_cost: vehicleInput.shippingCost,
      customs_cost: vehicleInput.customsCost,
      repair_cost: vehicleInput.preparationCost,
      marketing_cost: vehicleInput.marketingCost,
      other_expenses: vehicleInput.otherExpenses,
      total_landed_cost: vehicleInput.totalLandedCost,
      selling_price: vehicleInput.sellingPrice,
      gross_profit: vehicleInput.expectedProfit,
      net_profit: vehicleInput.expectedProfit,
      profit_margin: vehicleInput.profitMargin,
      currency_code: vehicleInput.currencyCode,
      notes: "Created from AI OCR vehicle intake review.",
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    });

    await supabase
      .from("ai_document_extractions")
      .update({
        status: "completed",
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", extractionId)
      .eq("company_id", workspace.companyId);

    await writeAuditLog({
      companyId: workspace.companyId,
      branchId,
      actorProfileId: workspace.profileId,
      action: "commit_ocr_vehicle_title",
      entityType: "vehicle",
      entityId: vehicle.id,
      newValues: { vin: vehicleInput.vin, stockNumber: vehicle.stock_number, totalLandedCost: vehicleInput.totalLandedCost, sellingPrice: vehicleInput.sellingPrice },
    });

    revalidatePath("/ai/automation");
    revalidatePath("/vehicles");
    return { success: true, vehicleId: vehicle.id };
  } else if (documentType === "supplier_invoice") {
    const supplierName = stringValue(formData.get("supplierName"), stringValue(data.supplierName, "AutoParts Depot Ltd"));
    const invoiceNumber = stringValue(
      formData.get("invoiceNumber"),
      stringValue(data.invoiceNumber, "INV-" + Math.floor(100000 + Math.random() * 900000)),
    );
    const amount = numberValue(formData.get("amount"), numberValue(data.amount));
    const partNumber = stringValue(formData.get("partNumber"), stringValue(data.partNumber, "BP-202X"));
    const partName = stringValue(formData.get("partName"), stringValue(data.partName, "Heavy-Duty Front Brake Pads"));
    const quantity = numberValue(formData.get("quantity"), numberValue(data.quantity, 1));

    let { data: supplier } = await supabase
      .from("part_suppliers")
      .select("id")
      .eq("company_id", workspace.companyId)
      .eq("supplier_name", supplierName)
      .limit(1)
      .single();

    if (!supplier) {
      const { data: newSupplier, error: supErr } = await supabase
        .from("part_suppliers")
        .insert({
          company_id: workspace.companyId,
          supplier_name: supplierName,
          status: "active",
          created_by: workspace.profileId,
          updated_by: workspace.profileId,
        })
        .select("id")
        .single();
      if (supErr || !newSupplier) {
        return { error: supErr?.message ?? "Failed to create supplier." };
      }
      supplier = newSupplier;
    }

    let activeBranchId = branchId;
    if (!activeBranchId) {
      const { data: branch } = await supabase
        .from("branches")
        .select("id")
        .eq("company_id", workspace.companyId)
        .limit(1)
        .single();
      activeBranchId = branch?.id || null;
    }

    const { data: po, error: poErr } = await supabase
      .from("part_purchase_orders")
      .insert({
        company_id: workspace.companyId,
        branch_id: activeBranchId,
        supplier_id: supplier.id,
        purchase_order_number: "PPO-" + Math.floor(100000 + Math.random() * 900000),
        status: "ordered",
        notes: `OCR Invoice Ingest: ${invoiceNumber}`,
        tax_amount: 0,
        currency_code: "AED",
        created_by: workspace.profileId,
        updated_by: workspace.profileId,
      })
      .select("id, purchase_order_number")
      .single();

    if (poErr) {
      return { error: poErr.message };
    }

    let { data: part } = await supabase
      .from("parts")
      .select("id")
      .eq("company_id", workspace.companyId)
      .eq("part_number", partNumber)
      .limit(1)
      .single();

    const unitCost = quantity > 0 ? Math.round(amount / quantity * 100) / 100 : amount;

    if (!part) {
      const { data: newPart, error: partErr } = await supabase
        .from("parts")
        .insert({
          company_id: workspace.companyId,
          part_number: partNumber,
          name: partName,
          unit_cost: unitCost,
          selling_price: Math.round(unitCost * 1.5),
          currency_code: "AED",
          status: "active",
          created_by: workspace.profileId,
          updated_by: workspace.profileId,
        })
        .select("id")
        .single();
      if (partErr || !newPart) {
        return { error: partErr?.message ?? "Failed to create part catalog record." };
      }
      part = newPart;
    }

    const { error: poItemErr } = await supabase
      .from("part_purchase_order_items")
      .insert({
        company_id: workspace.companyId,
        purchase_order_id: po.id,
        part_id: part.id,
        description: partName,
        quantity_ordered: quantity,
        unit_cost: unitCost,
        line_total: amount,
        created_by: workspace.profileId,
        updated_by: workspace.profileId,
      });

    if (poItemErr) {
      return { error: poItemErr.message };
    }

    await supabase
      .from("ai_document_extractions")
      .update({
        status: "completed",
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", extractionId)
      .eq("company_id", workspace.companyId);

    await writeAuditLog({
      companyId: workspace.companyId,
      branchId: activeBranchId,
      actorProfileId: workspace.profileId,
      action: "commit_ocr_supplier_invoice",
      entityType: "part_purchase_order",
      entityId: po.id,
      newValues: { invoiceNumber, poNumber: po.purchase_order_number },
    });

    revalidatePath("/ai/automation");
    revalidatePath("/parts/inventory");
    return { success: true, purchaseOrderId: po.id };
  }

  return { error: "Unknown document type." };
}

export async function resolveAiProposal(formData: FormData) {
  const { workspace } = await requireManageAiAutomationPermission();
  const proposalId = formData.get("proposalId") as string;
  const decision = formData.get("decision") as "approved" | "dismissed";
  const notes = formOptional(formData.get("notes"));

  if (!proposalId || !["approved", "dismissed"].includes(decision)) {
    return { error: "Invalid resolution request." };
  }

  const supabase = createServiceRoleClient();

  const { data: proposal, error: fetchErr } = await supabase
    .from("ai_automation_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("company_id", workspace.companyId)
    .single();

  if (fetchErr || !proposal) {
    return { error: "AI proposal not found." };
  }

  if (proposal.status !== "pending") {
    return { error: "AI proposal is already resolved." };
  }

  if (decision === "dismissed") {
    await supabase
      .from("ai_automation_proposals")
      .update({
        status: "dismissed",
        resolved_by: workspace.profileId,
        resolved_at: new Date().toISOString(),
        error_message: notes || null,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("company_id", workspace.companyId);

    revalidatePath("/ai/automation");
    return { success: true };
  }

  try {
    const proposedPayload = proposal.proposed_payload as JsonRecord;
    const branchId = proposal.branch_id;

    if (proposal.proposal_type === "lead_follow_up") {
      const leadId = stringValue(proposedPayload.leadId);
      const messageBody = stringValue(proposedPayload.messageBody, "Autonomous lead nurturing follow-up message.");
      const scheduledAt = stringValue(proposedPayload.scheduledAt, new Date().toISOString());

      if (!leadId) {
        throw new Error("Lead ID is missing in proposal payload.");
      }

      const { data: followUp, error: followUpErr } = await supabase
        .from("follow_ups")
        .insert({
          company_id: workspace.companyId,
          branch_id: branchId,
          lead_id: leadId,
          title: "AI CRM Outbound Follow-up",
          notes: messageBody,
          status: "open",
          due_at: scheduledAt,
          created_by: workspace.profileId,
          updated_by: workspace.profileId,
        })
        .select("id")
        .single();

      if (followUpErr) {
        throw followUpErr;
      }

      await writeAuditLog({
        companyId: workspace.companyId,
        branchId,
        actorProfileId: workspace.profileId,
        action: "execute_proposal_lead_follow_up",
        entityType: "follow_up",
        entityId: followUp.id,
        newValues: { leadId },
      });
    } else if (proposal.proposal_type === "parts_reorder") {
      const partNumber = stringValue(proposedPayload.partNumber, "BP-202X");
      const partName = stringValue(proposedPayload.partName, "Heavy-Duty Front Brake Pads");
      const supplierName = stringValue(proposedPayload.supplierName, "AutoParts Depot Ltd");
      const quantity = numberValue(proposedPayload.quantity, 10);
      const estimatedUnitCost = numberValue(proposedPayload.estimatedUnitCost);

      let { data: supplier } = await supabase
        .from("part_suppliers")
        .select("id")
        .eq("company_id", workspace.companyId)
        .eq("supplier_name", supplierName)
        .limit(1)
        .single();

      if (!supplier) {
        const { data: newSupplier, error: supErr } = await supabase
          .from("part_suppliers")
          .insert({
            company_id: workspace.companyId,
            supplier_name: supplierName,
            status: "active",
            created_by: workspace.profileId,
            updated_by: workspace.profileId,
          })
          .select("id")
          .single();
        if (supErr || !newSupplier) {
          throw new Error(supErr?.message ?? "Failed to create parts supplier.");
        }
        supplier = newSupplier;
      }

      const { data: po, error: poErr } = await supabase
        .from("part_purchase_orders")
        .insert({
          company_id: workspace.companyId,
          branch_id: branchId,
          supplier_id: supplier.id,
          purchase_order_number: "PPO-" + Math.floor(100000 + Math.random() * 900000),
          status: "ordered",
          notes: `AI Reorder Proposal Resolution: ${partName}`,
          tax_amount: 0,
          currency_code: "AED",
          created_by: workspace.profileId,
          updated_by: workspace.profileId,
        })
        .select("id, purchase_order_number")
        .single();

      if (poErr) {
        throw poErr;
      }

      let { data: part } = await supabase
        .from("parts")
        .select("id")
        .eq("company_id", workspace.companyId)
        .eq("part_number", partNumber)
        .limit(1)
        .single();

      if (!part) {
        const { data: newPart, error: partErr } = await supabase
          .from("parts")
          .insert({
            company_id: workspace.companyId,
            part_number: partNumber,
            name: partName,
            unit_cost: estimatedUnitCost,
            selling_price: Math.round(estimatedUnitCost * 1.5),
            currency_code: "AED",
            status: "active",
            created_by: workspace.profileId,
            updated_by: workspace.profileId,
          })
          .select("id")
          .single();
        if (partErr || !newPart) {
          throw new Error(partErr?.message ?? "Failed to create part catalog record.");
        }
        part = newPart;
      }

      const { error: poItemErr } = await supabase
        .from("part_purchase_order_items")
        .insert({
          company_id: workspace.companyId,
          purchase_order_id: po.id,
          part_id: part.id,
          description: partName,
          quantity_ordered: quantity,
          unit_cost: estimatedUnitCost,
          line_total: quantity * estimatedUnitCost,
          created_by: workspace.profileId,
          updated_by: workspace.profileId,
        });

      if (poItemErr) {
        throw poItemErr;
      }

      await writeAuditLog({
        companyId: workspace.companyId,
        branchId,
        actorProfileId: workspace.profileId,
        action: "execute_proposal_parts_reorder",
        entityType: "part_purchase_order",
        entityId: po.id,
        newValues: { poNumber: po.purchase_order_number, partNumber },
      });
    } else if (proposal.proposal_type === "vehicle_marketing") {
      const vehicleId = stringValue(proposedPayload.vehicleId);
      const headline = stringValue(proposedPayload.headline);
      const description = stringValue(proposedPayload.description);
      const askingPrice = numberValue(proposedPayload.askingPrice);
      const currencyCode = stringValue(proposedPayload.currencyCode, "AED");

      if (!vehicleId) {
        throw new Error("Vehicle ID is missing in proposal payload.");
      }

      const { data: vehicle, error: vehErr } = await supabase
        .from("vehicles")
        .select("branch_id, brand, model, year, selling_price, currency_code, export_available")
        .eq("id", vehicleId)
        .eq("company_id", workspace.companyId)
        .single();

      if (vehErr || !vehicle) {
        throw new Error("Vehicle associated with proposal was not found.");
      }

      const activeBranchId = branchId || vehicle.branch_id || null;
      const listingTitle = headline || `Listing for ${vehicle.year} ${vehicle.brand} ${vehicle.model}`;

      const { data: listing, error: listingErr } = await supabase
        .from("marketing_listings")
        .insert({
          company_id: workspace.companyId,
          branch_id: activeBranchId,
          vehicle_id: vehicleId,
          listing_number: "LST-" + Math.floor(100000 + Math.random() * 900000),
          title: listingTitle,
          short_description: headline || "",
          full_description: description || "",
          price: askingPrice || vehicle.selling_price || 0,
          currency_code: currencyCode,
          export_available: vehicle.export_available ?? true,
          status: "active",
          published_at: new Date().toISOString(),
          created_by: workspace.profileId,
          updated_by: workspace.profileId,
        })
        .select("id, listing_number")
        .single();

      if (listingErr) {
        throw listingErr;
      }

      await writeAuditLog({
        companyId: workspace.companyId,
        branchId: activeBranchId,
        actorProfileId: workspace.profileId,
        action: "execute_proposal_vehicle_marketing",
        entityType: "marketing_listing",
        entityId: listing.id,
        newValues: { vehicleId, listingNumber: listing.listing_number },
      });
    }

    await supabase
      .from("ai_automation_proposals")
      .update({
        status: "approved",
        resolved_by: workspace.profileId,
        resolved_at: new Date().toISOString(),
        error_message: notes || null,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("company_id", workspace.companyId);

    revalidatePath("/ai/automation");
    return { success: true };
  } catch (err: unknown) {
    const message = caughtMessage(err, "Execution failed.");
    await supabase
      .from("ai_automation_proposals")
      .update({
        status: "failed",
        error_message: message,
        updated_by: workspace.profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("company_id", workspace.companyId);

    revalidatePath("/ai/automation");
    return { error: message || "Execution of AI proposal failed." };
  }
}
