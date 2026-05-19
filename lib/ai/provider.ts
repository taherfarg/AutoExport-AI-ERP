import type { AiAnswerPayload } from "@/lib/ai/assistant";
import type { AiToolDefinition } from "@/lib/ai/tools";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

type EnvLike = {
  [key: string]: string | undefined;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
};

type ProviderFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

type ProviderResult = {
  provider: "local" | "openai";
  model: string;
  answerPayload: AiAnswerPayload;
  responseText: string;
  errorMessage?: string;
};

export type AiToolSelectionResult = {
  toolName: string;
  provider: "local" | "openai";
  model: string;
  errorMessage?: string;
};

function modelFromEnv(env: EnvLike) {
  return env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

function baseUrlFromEnv(env: EnvLike) {
  return (env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
}

function isOpenAiConfigured(env: EnvLike) {
  return Boolean(env.OPENAI_API_KEY?.trim());
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

  const model = modelFromEnv(env);
  const response = await fetcher(`${baseUrlFromEnv(env)}/responses`, {
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
  const model = modelFromEnv(env);

  if (!isOpenAiConfigured(env) || allowedTools.length === 0) {
    return { toolName: fallbackToolName, provider: "local", model: "deterministic" };
  }

  try {
    const text = await callResponsesApi({
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
      provider: "openai",
      model,
      errorMessage: allowed ? undefined : `Provider selected unavailable tool: ${selected}`,
    };
  } catch (error) {
    return {
      toolName: fallbackToolName,
      provider: "openai",
      model,
      errorMessage: error instanceof Error ? error.message : "OpenAI tool selection failed.",
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
  if (!isOpenAiConfigured(env)) {
    return {
      provider: "local",
      model: "deterministic",
      answerPayload,
      responseText: answerPayload.directAnswer,
    };
  }

  const model = modelFromEnv(env);

  try {
    const text = await callResponsesApi({
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
      provider: "openai",
      model,
      answerPayload: refinedPayload,
      responseText: refinedPayload.directAnswer,
    };
  } catch (error) {
    return {
      provider: "openai",
      model,
      answerPayload,
      responseText: answerPayload.directAnswer,
      errorMessage: error instanceof Error ? error.message : "OpenAI response generation failed.",
    };
  }
}
