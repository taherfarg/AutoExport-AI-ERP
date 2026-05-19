"use server";

import { revalidatePath } from "next/cache";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { buildAiAnswerPayload, decideApprovalRequirement, routeAiIntent } from "@/lib/ai/assistant";
import { makeAiNumber } from "@/lib/ai/format";
import { refineAiAnswerWithProvider, selectAiToolWithProvider } from "@/lib/ai/provider";
import { filterAiToolsByPermissions, findAiTool, getAiToolRegistry } from "@/lib/ai/tools";
import { createListingDraftFromVehicle, createSocialCaptionDraft } from "@/lib/marketing/calculations";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  aiApprovalDecisionSchema,
  askAiSchema,
  createAiExtractionRequestSchema,
  createAiReportRequestSchema,
} from "@/lib/validations/ai";
import { calculateVehiclePricing } from "@/lib/vehicles/pricing";

type Workspace = {
  companyId: string;
  profileId: string;
};

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
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
