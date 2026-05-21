import { describe, expect, it } from "vitest";
import {
  buildHealthPayload,
  getPublicSupabaseEnv,
  getServiceRoleEnv,
  validateRuntimeEnv,
} from "@/lib/env/runtime";

const completeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  AI_PROVIDER: "gemini",
  GEMINI_API_KEY: "gemini-secret",
  GEMINI_MODEL: "gemini-test",
  GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
  OPENAI_API_KEY: "openai-secret",
  OPENAI_MODEL: "gpt-test",
  OPENAI_BASE_URL: "https://api.openai.com/v1",
  STRIPE_SECRET_KEY: "stripe-secret",
  STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "stripe-publishable",
};

describe("runtime environment validation", () => {
  it("validates required app and Supabase environment variables", () => {
    const env = validateRuntimeEnv(completeEnv);

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-secret");
    expect(env.AI_PROVIDER).toBe("gemini");
    expect(env.GEMINI_MODEL).toBe("gemini-test");
    expect(env.OPENAI_MODEL).toBe("gpt-test");
    expect(env.OPENAI_BASE_URL).toBe("https://api.openai.com/v1");
  });

  it("throws a clear error when required variables are missing", () => {
    expect(() => validateRuntimeEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toThrow(
      /Missing required environment variables/,
    );
  });

  it("allows optional provider variables to be empty in local env files", () => {
    const env = validateRuntimeEnv({
      ...completeEnv,
      OPENAI_API_KEY: "",
      GEMINI_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
    });

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined();
    expect(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeUndefined();
  });

  it("returns only public Supabase configuration for browser clients", () => {
    const publicEnv = getPublicSupabaseEnv(completeEnv);

    expect(publicEnv).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      publishableKey: "publishable-key",
    });
    expect(JSON.stringify(publicEnv)).not.toContain("service-role-secret");
  });

  it("returns service-role configuration only for server code", () => {
    const serviceEnv = getServiceRoleEnv(completeEnv);

    expect(serviceEnv.serviceRoleKey).toBe("service-role-secret");
  });

  it("builds a safe health payload without leaking secret values", () => {
    const payload = buildHealthPayload(completeEnv);

    expect(payload.status).toBe("ok");
    expect(payload.supabaseUrlConfigured).toBe(true);
    expect(payload.serviceRoleConfigured).toBe(true);
    expect(payload.stripeConfigured).toBe(true);
    expect(payload.aiProvider).toBe("gemini");
    expect(payload.geminiConfigured).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("service-role-secret");
    expect(JSON.stringify(payload)).not.toContain("openai-secret");
    expect(JSON.stringify(payload)).not.toContain("gemini-secret");
    expect(JSON.stringify(payload)).not.toContain("stripe-secret");
  });
});
