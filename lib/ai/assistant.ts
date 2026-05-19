import { findAiTool } from "@/lib/ai/tools";

export type AiMetric = {
  label: string;
  value: string | number;
};

export type AiAnswerInput = {
  directAnswer: string;
  metrics?: AiMetric[];
  rows?: Record<string, unknown>[];
  suggestedActions?: string[];
};

export type AiAnswerPayload = {
  directAnswer: string;
  metrics: AiMetric[];
  rows: Record<string, unknown>[];
  suggestedActions: string[];
};

export function routeAiIntent(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("detail") || normalized.includes("specification") || normalized.includes("vin")) {
    return "getVehicleDetails";
  }

  if (normalized.includes("social") || normalized.includes("caption")) {
    return "generateSocialPostDraft";
  }

  if (normalized.includes("listing")) {
    return "generateListingDraft";
  }

  if (normalized.includes("quotation")) {
    return "createQuotationDraft";
  }

  if (normalized.includes("follow-up") || normalized.includes("follow up") || normalized.includes("leads due")) {
    return "getLeadsDueToday";
  }

  if (normalized.includes("payment") || normalized.includes("balance due") || normalized.includes("pending customer")) {
    return "getPendingPayments";
  }

  if (normalized.includes("missing document") || normalized.includes("documents missing")) {
    return "getMissingDocuments";
  }

  if (normalized.includes("price") || normalized.includes("margin") || normalized.includes("profit")) {
    return "calculateVehiclePricing";
  }

  if (normalized.includes("report")) {
    return "generateReportDraft";
  }

  if (normalized.includes("available") || normalized.includes("toyota") || normalized.includes("stock") || normalized.includes("cars")) {
    return normalized.includes("how many") ? "getAvailableStock" : "searchVehicles";
  }

  return "getAvailableStock";
}

export function buildAiAnswerPayload(input: AiAnswerInput): AiAnswerPayload {
  return {
    directAnswer: input.directAnswer,
    metrics: (input.metrics ?? []).map((metric) => ({ ...metric, value: String(metric.value) })),
    rows: input.rows ?? [],
    suggestedActions: input.suggestedActions ?? [],
  };
}

export function decideApprovalRequirement(toolName: string) {
  const tool = findAiTool(toolName);

  return {
    sensitive: tool?.sensitive ?? true,
    requiresApproval: tool?.requiresApproval ?? true,
  };
}
