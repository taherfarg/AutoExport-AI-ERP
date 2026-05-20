import { createHmac, timingSafeEqual } from "node:crypto";

type Metadata = Record<string, string>;

export type StripeCheckoutInput = {
  packageName: string;
  packageKey: string;
  amount: number;
  currency: string;
  interval: string;
  customerId?: string | null;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata: Metadata;
};

export type StripePortalInput = {
  customerId: string;
  returnUrl: string;
};

export type StripeCustomerInput = {
  email: string;
  name: string;
  metadata: Metadata;
};

export type BillingSessionResult = {
  provider: "stripe" | "manual";
  url: string;
  providerSessionId: string;
  simulated: boolean;
};

export type BillingCustomerResult = {
  provider: "stripe" | "manual";
  providerCustomerId: string;
  simulated: boolean;
};

export function getStripeServerConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    secretKey: env.STRIPE_SECRET_KEY?.trim() || null,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() || null,
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null,
  };
}

export function isStripeConfigured(env: NodeJS.ProcessEnv = process.env) {
  const { secretKey } = getStripeServerConfig(env);
  return Boolean(secretKey?.startsWith("sk_") && env.STRIPE_LIVE_BILLING_ENABLED === "true");
}

function appendMetadata(params: URLSearchParams, prefix: string, metadata: Metadata) {
  Object.entries(metadata).forEach(([key, value]) => {
    params.append(`${prefix}[metadata][${key}]`, value);
  });
}

async function postStripeForm<T>(path: string, params: URLSearchParams, secretKey: string): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Stripe request failed.");
  }

  return payload;
}

export async function createStripeCheckoutSession(input: StripeCheckoutInput): Promise<BillingSessionResult> {
  const { secretKey } = getStripeServerConfig();

  if (!secretKey || !isStripeConfigured()) {
    return {
      provider: "manual",
      url: `${input.successUrl}?simulated_checkout=1&package=${encodeURIComponent(input.packageKey)}`,
      providerSessionId: `sim_checkout_${input.packageKey}_${Date.now()}`,
      simulated: true,
    };
  }

  const params = new URLSearchParams();
  params.append("mode", "subscription");
  params.append("success_url", input.successUrl);
  params.append("cancel_url", input.cancelUrl);
  params.append("client_reference_id", input.metadata.company_id);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", input.currency.toLowerCase());
  params.append("line_items[0][price_data][unit_amount]", Math.round(input.amount * 100).toString());
  params.append("line_items[0][price_data][recurring][interval]", input.interval || "month");
  params.append("line_items[0][price_data][product_data][name]", `AutoSphere ERP ${input.packageName}`);
  appendMetadata(params, "", input.metadata);
  appendMetadata(params, "subscription_data", input.metadata);

  if (input.customerId) {
    params.append("customer", input.customerId);
  } else if (input.customerEmail) {
    params.append("customer_email", input.customerEmail);
  }

  const session = await postStripeForm<{ id: string; url: string }>("checkout/sessions", params, secretKey);

  return {
    provider: "stripe",
    url: session.url,
    providerSessionId: session.id,
    simulated: false,
  };
}

export async function createStripeCustomer(input: StripeCustomerInput): Promise<BillingCustomerResult> {
  const { secretKey } = getStripeServerConfig();

  if (!secretKey || !isStripeConfigured()) {
    return {
      provider: "manual",
      providerCustomerId: `sim_customer_${input.metadata.company_id}`,
      simulated: true,
    };
  }

  const params = new URLSearchParams();
  params.append("email", input.email);
  params.append("name", input.name);
  appendMetadata(params, "", input.metadata);

  const customer = await postStripeForm<{ id: string }>("customers", params, secretKey);

  return {
    provider: "stripe",
    providerCustomerId: customer.id,
    simulated: false,
  };
}

export async function createStripePortalSession(input: StripePortalInput): Promise<BillingSessionResult> {
  const { secretKey } = getStripeServerConfig();

  if (!secretKey || !isStripeConfigured()) {
    return {
      provider: "manual",
      url: `${input.returnUrl}?simulated_portal=1`,
      providerSessionId: `sim_portal_${input.customerId}_${Date.now()}`,
      simulated: true,
    };
  }

  const params = new URLSearchParams();
  params.append("customer", input.customerId);
  params.append("return_url", input.returnUrl);

  const session = await postStripeForm<{ id: string; url: string }>("billing_portal/sessions", params, secretKey);

  return {
    provider: "stripe",
    url: session.url,
    providerSessionId: session.id,
    simulated: false,
  };
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  toleranceSeconds = 300,
) {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  const entries = signatureHeader.split(",").map((part) => part.split("="));
  const timestamp = entries.find(([key]) => key === "t")?.[1];
  const signatures = entries.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
  if (age > toleranceSeconds) {
    return false;
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    try {
      const signatureBuffer = Buffer.from(signature, "hex");
      return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });
}
