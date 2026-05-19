import { describe, expect, test } from "vitest";
import {
  buildAiAnswerPayload,
  decideApprovalRequirement,
  routeAiIntent,
} from "@/lib/ai/assistant";
import {
  filterAiToolsByPermissions,
  getAiToolRegistry,
} from "@/lib/ai/tools";
import { formatAiStatus, makeAiNumber } from "@/lib/ai/format";
import {
  aiApprovalDecisionSchema,
  askAiSchema,
  createAiExtractionRequestSchema,
  createAiReportRequestSchema,
} from "@/lib/validations/ai";

describe("AI technical intelligence", () => {
  test("filters AI tools by user permissions", () => {
    const tools = filterAiToolsByPermissions(getAiToolRegistry(), new Set(["use_ai_assistant", "view_vehicles"]));

    expect(tools.map((tool) => tool.name)).toContain("getAvailableStock");
    expect(tools.map((tool) => tool.name)).not.toContain("getPendingPayments");
  });

  test("routes common automotive questions to deterministic tools", () => {
    expect(routeAiIntent("Which Toyota cars are available?")).toBe("searchVehicles");
    expect(routeAiIntent("Which leads need follow-up today?")).toBe("getLeadsDueToday");
    expect(routeAiIntent("Show pending customer payments.")).toBe("getPendingPayments");
    expect(routeAiIntent("Create social media caption for this vehicle.")).toBe("generateSocialPostDraft");
  });

  test("formats AI answer payloads with metrics, rows, and actions", () => {
    expect(
      buildAiAnswerPayload({
        directAnswer: "There are 3 available vehicles.",
        metrics: [{ label: "Available", value: 3 }],
        rows: [{ stockNumber: "PLX-001", vehicle: "Toyota Hilux" }],
        suggestedActions: ["Open inventory"],
      }),
    ).toEqual({
      directAnswer: "There are 3 available vehicles.",
      metrics: [{ label: "Available", value: "3" }],
      rows: [{ stockNumber: "PLX-001", vehicle: "Toyota Hilux" }],
      suggestedActions: ["Open inventory"],
    });
  });

  test("marks sensitive AI tools as approval-required", () => {
    expect(decideApprovalRequirement("createQuotationDraft")).toEqual({
      sensitive: true,
      requiresApproval: true,
    });
    expect(decideApprovalRequirement("getAvailableStock")).toEqual({
      sensitive: false,
      requiresApproval: false,
    });
  });

  test("formats AI statuses and numbers", () => {
    expect(formatAiStatus("approval_required")).toBe("Approval required");
    expect(makeAiNumber("AI", 123456)).toBe("AI-2N9C");
  });

  test("validates AI ask, report, extraction, and approval payloads", () => {
    expect(
      askAiSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        prompt: "How many cars are available?",
      }),
    ).toMatchObject({ prompt: "How many cars are available?" });

    expect(
      createAiReportRequestSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        reportType: "inventory",
        prompt: "Generate inventory report",
      }),
    ).toMatchObject({ reportNumber: expect.stringMatching(/^AIR-/), reportType: "inventory" });

    expect(
      createAiExtractionRequestSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        documentId: "33333333-3333-4333-8333-333333333333",
        documentType: "vehicle_title",
      }),
    ).toMatchObject({ extractionNumber: expect.stringMatching(/^AIX-/), documentType: "vehicle_title" });

    expect(
      aiApprovalDecisionSchema.parse({
        approvalId: "44444444-4444-4444-8444-444444444444",
        decision: "approved",
        notes: "Manager approved draft.",
      }),
    ).toMatchObject({ decision: "approved" });
  });
});
