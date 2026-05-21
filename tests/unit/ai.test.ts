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
import { extractDocumentOcrWithProvider, refineAiAnswerWithProvider, selectAiToolWithProvider } from "@/lib/ai/provider";
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

  test("routes and refines through Gemini generateContent provider", async () => {
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/models/gemini-test:generateContent");
      const body = JSON.parse(String(init?.body)) as {
        systemInstruction?: { parts?: Array<{ text: string }> };
        contents: Array<{ parts: Array<{ text: string }> }>;
      };
      const promptText = [
        body.systemInstruction?.parts?.[0]?.text ?? "",
        body.contents[0]?.parts[0]?.text ?? "",
      ].join("\n");
      const outputText = promptText.includes("route")
        ? "{\"toolName\":\"getLeadsDueToday\"}"
        : "{\"directAnswer\":\"3 leads need follow-up today.\",\"suggestedActions\":[\"Open follow-ups\"]}";

      return new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: outputText }],
            },
          },
        ],
      }), { status: 200 });
    });

    const env = {
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "gemini-secret",
      GEMINI_MODEL: "gemini-test",
      GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
    };
    const selection = await selectAiToolWithProvider({
      prompt: "Which leads need follow-up today?",
      fallbackToolName: "getAvailableStock",
      allowedTools: getAiToolRegistry(),
      env,
      fetcher,
    });

    expect(selection).toMatchObject({
      toolName: "getLeadsDueToday",
      provider: "gemini",
      model: "gemini-test",
    });

    const result = await refineAiAnswerWithProvider({
      prompt: "Which leads need follow-up today?",
      toolName: "getLeadsDueToday",
      answerPayload: buildAiAnswerPayload({ directAnswer: "There are leads due today." }),
      sensitive: false,
      requiresApproval: false,
      env,
      fetcher,
    });

    expect(result.provider).toBe("gemini");
    expect(result.answerPayload.directAnswer).toBe("3 leads need follow-up today.");
    expect(result.answerPayload.suggestedActions).toEqual(["Open follow-ups"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("sends uploaded images to Gemini OCR using inline image data", async () => {
    const fetcher = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        contents: Array<{ parts: Array<{ inline_data?: { mime_type: string; data: string }; text?: string }> }>;
      };

      expect(body.contents[0].parts[0].inline_data).toEqual({
        mime_type: "image/jpeg",
        data: "base64-plate-image",
      });
      expect(body.contents[0].parts[1].text).toContain("license plate photo");

      return new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    rawText: "DUBAI A 12345",
                    vin: null,
                    make: null,
                    model: null,
                    year: null,
                    color: null,
                    licensePlate: "DUBAI A 12345",
                    confidence: 0.88,
                  }),
                },
              ],
            },
          },
        ],
      }), { status: 200 });
    });

    const result = await extractDocumentOcrWithProvider({
      documentType: "vehicle_title",
      image: {
        dataBase64: "base64-plate-image",
        mimeType: "image/jpeg",
        fileName: "plate.jpeg",
      },
      env: {
        AI_PROVIDER: "gemini",
        GEMINI_API_KEY: "gemini-secret",
        GEMINI_MODEL: "gemini-test",
      },
      fetcher,
    });

    expect(result).toMatchObject({
      provider: "gemini",
      model: "gemini-test",
      rawText: "DUBAI A 12345",
      parsed: {
        licensePlate: "DUBAI A 12345",
        confidence: 0.88,
      },
    });
  });
});
