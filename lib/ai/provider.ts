import type { AiAnswerPayload } from "@/lib/ai/assistant";
import type { AiToolDefinition } from "@/lib/ai/tools";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type EnvLike = {
  [key: string]: string | undefined;
  AI_PROVIDER?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
};

type ProviderFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
type LiveAiProvider = "openai" | "gemini";
type AiProvider = "local" | LiveAiProvider;

type ProviderResult = {
  provider: AiProvider;
  model: string;
  answerPayload: AiAnswerPayload;
  responseText: string;
  errorMessage?: string;
};

type OcrDocumentType = "vehicle_title" | "supplier_invoice";

type DocumentImageInput = {
  dataBase64: string;
  mimeType: string;
  fileName?: string;
};

type DocumentOcrResult = {
  provider: AiProvider;
  model: string;
  rawText: string;
  parsed: Record<string, unknown>;
  responseText: string;
};

export type AiToolSelectionResult = {
  toolName: string;
  provider: AiProvider;
  model: string;
  errorMessage?: string;
};

function requestedProviderFromEnv(env: EnvLike): LiveAiProvider | undefined {
  const requested = env.AI_PROVIDER?.trim().toLowerCase();
  return requested === "gemini" || requested === "openai" ? requested : undefined;
}

function configuredProviderFromEnv(env: EnvLike): LiveAiProvider | undefined {
  const requested = requestedProviderFromEnv(env);

  if (requested === "gemini") {
    return env.GEMINI_API_KEY?.trim() ? "gemini" : undefined;
  }

  if (requested === "openai") {
    return env.OPENAI_API_KEY?.trim() ? "openai" : undefined;
  }

  if (env.GEMINI_API_KEY?.trim()) return "gemini";
  if (env.OPENAI_API_KEY?.trim()) return "openai";
  return undefined;
}

function modelFromEnv(env: EnvLike, provider: LiveAiProvider) {
  if (provider === "gemini") {
    return env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  }

  return env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

function openAiBaseUrlFromEnv(env: EnvLike) {
  return (env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
}

function geminiBaseUrlFromEnv(env: EnvLike) {
  return (env.GEMINI_BASE_URL?.trim() || DEFAULT_GEMINI_BASE_URL).replace(/\/+$/, "");
}

function textFromResponseBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  if ("output_text" in body && typeof body.output_text === "string") {
    return body.output_text;
  }

  const output = "output" in body ? body.output : undefined;
  if (!Array.isArray(output)) {
    return undefined;
  }

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content.flatMap((contentItem: unknown) => {
        if (!contentItem || typeof contentItem !== "object") {
          return [];
        }

        if ("text" in contentItem && typeof contentItem.text === "string") {
          return [contentItem.text];
        }

        if ("type" in contentItem && contentItem.type === "output_text" && "text" in contentItem && typeof contentItem.text === "string") {
          return [contentItem.text];
        }

        return [];
      });
    })
    .join("\n")
    .trim();
}

function textFromGeminiResponseBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("candidates" in body) || !Array.isArray(body.candidates)) {
    return undefined;
  }

  return body.candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || !("content" in candidate)) return [];
      const content = candidate.content;
      if (!content || typeof content !== "object" || !("parts" in content) || !Array.isArray(content.parts)) return [];

      return content.parts.flatMap((part: unknown) => {
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return [part.text];
        }

        return [];
      });
    })
    .join("\n")
    .trim();
}

function parseJsonObject(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  const jsonCandidate = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonCandidate) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

async function callResponsesApi({
  env,
  fetcher,
  instructions,
  input,
  maxOutputTokens = 700,
}: {
  env: EnvLike;
  fetcher: ProviderFetch;
  instructions: string;
  input: unknown;
  maxOutputTokens?: number;
}) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = modelFromEnv(env, "openai");
  const response = await fetcher(`${openAiBaseUrlFromEnv(env)}/responses`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input: typeof input === "string" ? input : JSON.stringify(input),
      max_output_tokens: maxOutputTokens,
      store: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI provider failed with ${response.status}: ${errorText.slice(0, 240)}`);
  }

  const body = await response.json() as unknown;
  return textFromResponseBody(body) ?? "";
}

async function callGeminiGenerateContent({
  env,
  fetcher,
  instructions,
  input,
  maxOutputTokens = 700,
}: {
  env: EnvLike;
  fetcher: ProviderFetch;
  instructions: string;
  input: unknown;
  maxOutputTokens?: number;
}) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = modelFromEnv(env, "gemini").replace(/^models\//, "");
  const endpoint = `${geminiBaseUrlFromEnv(env)}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: instructions }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: typeof input === "string" ? input : JSON.stringify(input) }],
        },
      ],
      generationConfig: {
        maxOutputTokens,
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini provider failed with ${response.status}: ${errorText.slice(0, 240)}`);
  }

  const body = await response.json() as unknown;
  return textFromGeminiResponseBody(body) ?? "";
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeProviderOcrPayload(documentType: OcrDocumentType, parsed: Record<string, unknown> | undefined) {
  if (documentType === "vehicle_title") {
    return {
      vin: stringOrNull(parsed?.vin),
      make: stringOrNull(parsed?.make ?? parsed?.brand),
      model: stringOrNull(parsed?.model),
      year: numberOrNull(parsed?.year),
      color: stringOrNull(parsed?.color ?? parsed?.exteriorColor),
      licensePlate: stringOrNull(parsed?.licensePlate ?? parsed?.plateNumber ?? parsed?.plate),
      confidence: numberOrNull(parsed?.confidence),
    };
  }

  return {
    supplierName: stringOrNull(parsed?.supplierName ?? parsed?.supplier),
    invoiceNumber: stringOrNull(parsed?.invoiceNumber),
    amount: numberOrNull(parsed?.amount),
    partNumber: stringOrNull(parsed?.partNumber),
    partName: stringOrNull(parsed?.partName ?? parsed?.description),
    quantity: numberOrNull(parsed?.quantity),
    confidence: numberOrNull(parsed?.confidence),
  };
}

function ocrInstructionsForDocument(documentType: OcrDocumentType) {
  if (documentType === "vehicle_title") {
    return [
      "You are AutoSphere ERP's OCR extraction engine for automotive documents and photos.",
      "Read the provided image or PDF carefully. It may be a vehicle title, registration card, VIN plate, chassis plate, or license plate photo.",
      "Return only valid JSON with this exact shape:",
      "{\"rawText\":\"all readable text\",\"vin\":null,\"make\":null,\"model\":null,\"year\":null,\"color\":null,\"licensePlate\":null,\"confidence\":0.0}",
      "Use null for fields not visible. If the image is only a license plate, fill licensePlate and rawText, but do not invent VIN, make, model, year, or color.",
    ].join("\n");
  }

  return [
    "You are AutoSphere ERP's OCR extraction engine for automotive supplier invoices.",
    "Read the provided image or PDF and extract supplier, invoice, part, quantity, and amount details.",
    "Return only valid JSON with this exact shape:",
    "{\"rawText\":\"all readable text\",\"supplierName\":null,\"invoiceNumber\":null,\"amount\":null,\"partNumber\":null,\"partName\":null,\"quantity\":null,\"confidence\":0.0}",
    "Use null for fields not visible. Do not invent missing values.",
  ].join("\n");
}

async function callGeminiDocumentOcr({
  env,
  fetcher,
  documentType,
  image,
}: {
  env: EnvLike;
  fetcher: ProviderFetch;
  documentType: OcrDocumentType;
  image: DocumentImageInput;
}) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = modelFromEnv(env, "gemini").replace(/^models\//, "");
  const endpoint = `${geminiBaseUrlFromEnv(env)}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: image.mimeType,
                data: image.dataBase64,
              },
            },
            {
              text: ocrInstructionsForDocument(documentType),
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 900,
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini OCR failed with ${response.status}: ${errorText.slice(0, 240)}`);
  }

  const body = await response.json() as unknown;
  return textFromGeminiResponseBody(body) ?? "";
}

async function callLiveProvider({
  provider,
  env,
  fetcher,
  instructions,
  input,
  maxOutputTokens,
}: {
  provider: LiveAiProvider;
  env: EnvLike;
  fetcher: ProviderFetch;
  instructions: string;
  input: unknown;
  maxOutputTokens?: number;
}) {
  if (provider === "gemini") {
    return callGeminiGenerateContent({ env, fetcher, instructions, input, maxOutputTokens });
  }

  return callResponsesApi({ env, fetcher, instructions, input, maxOutputTokens });
}

export async function selectAiToolWithProvider({
  prompt,
  fallbackToolName,
  allowedTools,
  env = process.env,
  fetcher = fetch,
}: {
  prompt: string;
  fallbackToolName: string;
  allowedTools: AiToolDefinition[];
  env?: EnvLike;
  fetcher?: ProviderFetch;
}): Promise<AiToolSelectionResult> {
  const provider = configuredProviderFromEnv(env);

  if (!provider || allowedTools.length === 0) {
    return { toolName: fallbackToolName, provider: "local", model: "deterministic" };
  }

  const model = modelFromEnv(env, provider);

  try {
    const text = await callLiveProvider({
      provider,
      env,
      fetcher,
      maxOutputTokens: 120,
      instructions:
        "You route Automotive ERP questions to exactly one allowed server-side tool. Return only JSON: {\"toolName\":\"...\"}. Never invent tool names.",
      input: {
        prompt,
        allowedTools: allowedTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          sensitive: tool.sensitive,
          requiresApproval: tool.requiresApproval,
        })),
      },
    });
    const parsed = parseJsonObject(text);
    const selected = typeof parsed?.toolName === "string" ? parsed.toolName : fallbackToolName;
    const allowed = allowedTools.some((tool) => tool.name === selected);

    return {
      toolName: allowed ? selected : fallbackToolName,
      provider,
      model,
      errorMessage: allowed ? undefined : `Provider selected unavailable tool: ${selected}`,
    };
  } catch (error) {
    return {
      toolName: fallbackToolName,
      provider,
      model,
      errorMessage: error instanceof Error ? error.message : "AI provider tool selection failed.",
    };
  }
}

export async function refineAiAnswerWithProvider({
  prompt,
  toolName,
  toolDescription,
  answerPayload,
  sensitive,
  requiresApproval,
  env = process.env,
  fetcher = fetch,
}: {
  prompt: string;
  toolName: string;
  toolDescription?: string;
  answerPayload: AiAnswerPayload;
  sensitive: boolean;
  requiresApproval: boolean;
  env?: EnvLike;
  fetcher?: ProviderFetch;
}): Promise<ProviderResult> {
  const provider = configuredProviderFromEnv(env);

  if (!provider) {
    return {
      provider: "local",
      model: "deterministic",
      answerPayload,
      responseText: answerPayload.directAnswer,
    };
  }

  const model = modelFromEnv(env, provider);

  try {
    const text = await callLiveProvider({
      provider,
      env,
      fetcher,
      instructions:
        "You are AutoSphere ERP's permission-aware AI assistant. Use only the supplied server-side tool result. Do not invent data, expose hidden finance/profit fields, or claim that an approval-gated action was executed. Return JSON with directAnswer and suggestedActions.",
      input: {
        userPrompt: prompt,
        selectedTool: { name: toolName, description: toolDescription, sensitive, requiresApproval },
        serverToolResult: answerPayload,
      },
    });
    const parsed = parseJsonObject(text);
    const directAnswer = typeof parsed?.directAnswer === "string" && parsed.directAnswer.trim().length > 0
      ? parsed.directAnswer.trim()
      : answerPayload.directAnswer;
    const suggestedActions = Array.isArray(parsed?.suggestedActions)
      ? parsed.suggestedActions.filter((action): action is string => typeof action === "string").slice(0, 6)
      : answerPayload.suggestedActions;
    const refinedPayload: AiAnswerPayload = {
      ...answerPayload,
      directAnswer,
      suggestedActions,
    };

    return {
      provider,
      model,
      answerPayload: refinedPayload,
      responseText: refinedPayload.directAnswer,
    };
  } catch (error) {
    return {
      provider,
      model,
      answerPayload,
      responseText: answerPayload.directAnswer,
      errorMessage: error instanceof Error ? error.message : "AI provider response generation failed.",
    };
  }
}

export async function extractDocumentOcrWithProvider({
  documentType,
  image,
  env = process.env,
  fetcher = fetch,
}: {
  documentType: OcrDocumentType;
  image: DocumentImageInput;
  env?: EnvLike;
  fetcher?: ProviderFetch;
}): Promise<DocumentOcrResult> {
  const provider = configuredProviderFromEnv(env);

  if (provider !== "gemini") {
    throw new Error("Gemini OCR is not configured. Add GEMINI_API_KEY and AI_PROVIDER=gemini to use image OCR.");
  }

  const model = modelFromEnv(env, provider);
  const responseText = await callGeminiDocumentOcr({
    env,
    fetcher,
    documentType,
    image,
  });
  const parsed = parseJsonObject(responseText);
  const rawText = stringOrNull(parsed?.rawText) ?? responseText.trim();

  return {
    provider,
    model,
    rawText,
    parsed: normalizeProviderOcrPayload(documentType, parsed),
    responseText,
  };
}
