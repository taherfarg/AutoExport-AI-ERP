import { PERMISSIONS } from "@/lib/permissions/permissions";

export type AiToolDefinition = {
  name: string;
  description: string;
  requiredPermissions: string[];
  sensitive: boolean;
  requiresApproval: boolean;
};

const AI_TOOLS: AiToolDefinition[] = [
  {
    name: "getAvailableStock",
    description: "Count and list available vehicles.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_VEHICLES],
    sensitive: false,
    requiresApproval: false,
  },
  {
    name: "searchVehicles",
    description: "Search vehicles by brand, model, status, export readiness, or stock number.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_VEHICLES],
    sensitive: false,
    requiresApproval: false,
  },
  {
    name: "getVehicleDetails",
    description: "Fetch customer-facing vehicle details.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_VEHICLES],
    sensitive: false,
    requiresApproval: false,
  },
  {
    name: "getLeadsDueToday",
    description: "Find leads and follow-ups due today.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_LEADS],
    sensitive: false,
    requiresApproval: false,
  },
  {
    name: "getPendingPayments",
    description: "Summarize pending customer payment balances.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_PAYMENTS],
    sensitive: true,
    requiresApproval: false,
  },
  {
    name: "getMissingDocuments",
    description: "Find missing or unverified vehicle and operational documents.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_DOCUMENTS],
    sensitive: false,
    requiresApproval: false,
  },
  {
    name: "calculateVehiclePricing",
    description: "Calculate landed cost, margin, and suggested selling price.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_VEHICLE_COST, PERMISSIONS.VIEW_VEHICLE_PROFIT],
    sensitive: true,
    requiresApproval: false,
  },
  {
    name: "generateListingDraft",
    description: "Generate a vehicle listing draft.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.MANAGE_MARKETING, PERMISSIONS.VIEW_VEHICLES],
    sensitive: false,
    requiresApproval: false,
  },
  {
    name: "generateSocialPostDraft",
    description: "Generate a social media post draft.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.MANAGE_MARKETING, PERMISSIONS.VIEW_VEHICLES],
    sensitive: false,
    requiresApproval: false,
  },
  {
    name: "createQuotationDraft",
    description: "Prepare a quotation draft for manager review.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.CREATE_QUOTATION],
    sensitive: true,
    requiresApproval: true,
  },
  {
    name: "createFollowUpTask",
    description: "Prepare a follow-up task for approval or manual creation.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.CREATE_FOLLOW_UP],
    sensitive: true,
    requiresApproval: true,
  },
  {
    name: "generateReportDraft",
    description: "Generate a report request draft.",
    requiredPermissions: [PERMISSIONS.USE_AI_ASSISTANT, PERMISSIONS.VIEW_REPORTS],
    sensitive: true,
    requiresApproval: true,
  },
];

export function getAiToolRegistry() {
  return AI_TOOLS;
}

export function filterAiToolsByPermissions(tools: AiToolDefinition[], permissions: Set<string>) {
  return tools.filter((tool) => tool.requiredPermissions.every((permission) => permissions.has(permission)));
}

export function findAiTool(name: string) {
  return AI_TOOLS.find((tool) => tool.name === name);
}
