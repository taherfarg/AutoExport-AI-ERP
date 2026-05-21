import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().url().optional(),
);

const optionalBooleanString = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.enum(["true", "false"]).optional(),
);

const runtimeEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_APP_URL: z.string().trim().url(),
  AI_PROVIDER: z.enum(["local", "openai", "gemini"]).optional(),
  GEMINI_API_KEY: optionalNonEmptyString,
  GEMINI_MODEL: optionalNonEmptyString,
  GEMINI_BASE_URL: optionalUrl,
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_MODEL: optionalNonEmptyString,
  OPENAI_BASE_URL: optionalUrl,
  STRIPE_SECRET_KEY: optionalNonEmptyString,
  STRIPE_WEBHOOK_SECRET: optionalNonEmptyString,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalNonEmptyString,
  STRIPE_LIVE_BILLING_ENABLED: optionalBooleanString,
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export type RuntimeEnvSource = Record<string, string | undefined>;

export function validateRuntimeEnv(env: RuntimeEnvSource = process.env): RuntimeEnv {
  const parsed = runtimeEnvSchema.safeParse(env);

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Missing required environment variables: ${missing}`);
  }

  return parsed.data;
}

export function getPublicSupabaseEnv(env: RuntimeEnvSource = process.env) {
  const parsed = validateRuntimeEnv(env);

  return {
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getServiceRoleEnv(env: RuntimeEnvSource = process.env) {
  const parsed = validateRuntimeEnv(env);

  return {
    supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function buildHealthPayload(env: RuntimeEnvSource = process.env) {
  const parsed = runtimeEnvSchema.safeParse(env);
  const configured = parsed.success;

  return {
    status: configured ? "ok" : "misconfigured",
    environment: env.NODE_ENV ?? "development",
    supabaseUrlConfigured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKeyConfigured: Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    serviceRoleConfigured: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    appUrlConfigured: Boolean(env.NEXT_PUBLIC_APP_URL),
    aiProvider: env.AI_PROVIDER ?? (env.GEMINI_API_KEY ? "gemini" : env.OPENAI_API_KEY ? "openai" : "local"),
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
    openAiConfigured: Boolean(env.OPENAI_API_KEY),
    stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
    stripeWebhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
    timestamp: new Date().toISOString(),
  };
}
