import { describe, expect, test, vi } from "vitest";
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
import { refineAiAnswerWithProvider, selectAiToolWithProvider } from "@/lib/ai/provider";
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
    expect(routeAiIntent("Show vehicle details for PLX-DXB-001")).toBe("getVehicleDetails");
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

  test("uses deterministic AI provider fallback when OpenAI is not configured", async () => {
    const tools = getAiToolRegistry();
    const selection = await selectAiToolWithProvider({
      prompt: "Which cars are available?",
      fallbackToolName: "searchVehicles",
      allowedTools: tools,
      env: {},
    });

    expect(selection).toMatchObject({
      toolName: "searchVehicles",
      provider: "local",
      model: "deterministic",
    });

    const payload = buildAiAnswerPayload({ directAnswer: "Found 2 vehicles." });
    await expect(refineAiAnswerWithProvider({
      prompt: "Which cars are available?",
      toolName: "searchVehicles",
      answerPayload: payload,
      sensitive: false,
      requiresApproval: false,
      env: {},
    })).resolves.toMatchObject({
      provider: "local",
      model: "deterministic",
      answerPayload: payload,
    });
  });

  test("routes and refines through an OpenAI-compatible Responses provider", async () => {
    const fetcher = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { instructions: string };
      const outputText = body.instructions.includes("route")
        ? "{\"toolName\":\"getPendingPayments\"}"
        : "{\"directAnswer\":\"There are pending payment balances that need accountant review.\",\"suggestedActions\":[\"Open payments\"]}";

      return new Response(JSON.stringify({ output_text: outputText }), { status: 200 });
    });

    const allowedTools = getAiToolRegistry();
    const env = {
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "gpt-test",
      OPENAI_BASE_URL: "https://example.test/v1",
    };
    const selection = await selectAiToolWithProvider({
      prompt: "Show pending customer payments.",
      fallbackToolName: "getAvailableStock",
      allowedTools,
      env,
      fetcher,
    });

    expect(selection).toMatchObject({
      toolName: "getPendingPayments",
      provider: "openai",
      model: "gpt-test",
    });

    const result = await refineAiAnswerWithProvider({
      prompt: "Show pending customer payments.",
      toolName: "getPendingPayments",
      answerPayload: buildAiAnswerPayload({ directAnswer: "There are 2 invoices with pending balances." }),
      sensitive: true,
      requiresApproval: false,
      env,
      fetcher,
    });

    expect(result.provider).toBe("openai");
    expect(result.answerPayload.directAnswer).toContain("pending payment balances");
    expect(result.answerPayload.suggestedActions).toEqual(["Open payments"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
