"use server";

import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { validateRuntimeEnv } from "@/lib/env/runtime";
import { buildCheckoutMetadata, calculateUsageStatus, mapPackageToUsageLimits, type UsageMetricKey } from "@/lib/billing/usage";
import { createStripeCheckoutSession, createStripeCustomer, createStripePortalSession } from "@/lib/billing/stripe";
import {
  billingCustomerSchema,
  checkoutSessionSchema,
  portalSessionSchema,
  refreshUsageSchema,
} from "@/lib/validations/billing";

type ActionResult = {
  success?: string;
  error?: string;
  url?: string;
};

async function requireBillingManager() {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(PERMISSIONS.MANAGE_SUBSCRIPTIONS)) {
    throw new Error("You do not have permission to manage subscriptions.");
  }

  return workspace;
}

async function writeAuditLog({
  companyId,
  actorProfileId,
  action,
  entityType,
  entityId,
  newValues,
}: {
  companyId: string;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    severity: "info",
    new_values: newValues ?? null,
  });
}

function currentBillingPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

async function getCurrentPackage(companyId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("packages(package_key, max_branches, max_users, max_vehicles, max_ai_requests)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (error || !data?.packages) {
    throw new Error(error?.message ?? "Subscription package was not found.");
  }

  const packageData = Array.isArray(data.packages) ? data.packages[0] : data.packages;
  return {
    packageKey: packageData.package_key,
    maxBranches: packageData.max_branches,
    maxUsers: packageData.max_users,
    maxVehicles: packageData.max_vehicles,
    maxAiRequests: packageData.max_ai_requests,
  };
}

async function countMetric(companyId: string, metricKey: UsageMetricKey) {
  const supabase = createServiceRoleClient();

  const tableByMetric: Partial<Record<UsageMetricKey, string>> = {
    branches: "branches",
    users: "company_memberships",
    vehicles: "vehicles",
    ai_requests: "ai_requests",
    marketing_listings: "marketing_listings",
    export_orders: "export_orders",
  };

  if (metricKey === "storage_mb") {
    return { currentValue: 0, sourceTable: "storage.objects" };
  }

  const table = tableByMetric[metricKey];
  if (!table) {
    return { currentValue: 0, sourceTable: null };
  }

  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId);

  if (metricKey === "branches" || metricKey === "vehicles" || metricKey === "marketing_listings") {
    query = query.is("deleted_at", null);
  }

  if (metricKey === "users") {
    query = query.eq("status", "active");
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return { currentValue: count ?? 0, sourceTable: table };
}

export async function refreshUsageCounters(formData: FormData): Promise<ActionResult> {
  const workspace = await requireBillingManager();
  const parsed = refreshUsageSchema.safeParse({
    companyId: formData.get("companyId"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Usage refresh request is invalid." };
  }

  const packageData = await getCurrentPackage(workspace.companyId);
  const limits = mapPackageToUsageLimits(packageData);
  const period = currentBillingPeriod();
  const supabase = createServiceRoleClient();

  const metricKeys = Object.keys(limits) as UsageMetricKey[];
  let warningCount = 0;

  for (const metricKey of metricKeys) {
    const { currentValue, sourceTable } = await countMetric(workspace.companyId, metricKey);
    const limitValue = limits[metricKey];
    const usage = calculateUsageStatus(currentValue, limitValue);

    await supabase.from("usage_counters").upsert(
      {
        company_id: workspace.companyId,
        metric_key: metricKey,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        current_value: currentValue,
        limit_value: limitValue,
        source_table: sourceTable,
        refreshed_at: new Date().toISOString(),
      },
      { onConflict: "company_id,metric_key,period_start,period_end" },
    );

    if (usage.status === "warning" || usage.status === "blocked") {
      warningCount += 1;
      await supabase.from("usage_limit_events").insert({
        company_id: workspace.companyId,
        metric_key: metricKey,
        event_type: usage.status === "blocked" ? "blocked" : "warning",
        current_value: currentValue,
        limit_value: limitValue,
        message:
          usage.status === "blocked"
            ? `${metricKey} usage is over the package limit.`
            : `${metricKey} usage is close to the package limit.`,
        created_by: workspace.profileId,
      });
    }
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    actorProfileId: workspace.profileId,
    action: "refresh_usage_counters",
    entityType: "billing_usage",
    newValues: { warningCount },
  });

  return { success: warningCount > 0 ? `Usage refreshed with ${warningCount} warnings.` : "Usage counters refreshed." };
}

export async function saveBillingCustomer(formData: FormData): Promise<ActionResult> {
  const workspace = await requireBillingManager();
  const parsed = billingCustomerSchema.safeParse({
    companyId: formData.get("companyId"),
    billingEmail: formData.get("billingEmail"),
    billingName: formData.get("billingName"),
    defaultCurrencyCode: formData.get("defaultCurrencyCode") || "USD",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Billing customer details are invalid." };
  }

  const metadata = buildCheckoutMetadata({
    companyId: workspace.companyId,
    packageKey: "current",
    actorProfileId: workspace.profileId,
  });
  const stripeCustomer = await createStripeCustomer({
    email: parsed.data.billingEmail,
    name: parsed.data.billingName,
    metadata,
  });
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("billing_customers")
    .upsert(
      {
        company_id: workspace.companyId,
        provider: stripeCustomer.provider,
        provider_customer_id: stripeCustomer.providerCustomerId,
        billing_email: parsed.data.billingEmail,
        billing_name: parsed.data.billingName,
        default_currency_code: parsed.data.defaultCurrencyCode,
        status: "active",
        metadata: { simulated: stripeCustomer.simulated },
        created_by: workspace.profileId,
        updated_by: workspace.profileId,
      },
      { onConflict: "company_id,provider" },
    )
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Billing customer could not be saved." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    actorProfileId: workspace.profileId,
    action: "save_billing_customer",
    entityType: "billing_customer",
    entityId: data.id,
    newValues: { provider: stripeCustomer.provider, simulated: stripeCustomer.simulated },
  });

  return { success: stripeCustomer.simulated ? "Billing customer saved in local simulation mode." : "Stripe billing customer saved." };
}

export async function createCheckoutSession(formData: FormData): Promise<ActionResult> {
  const workspace = await requireBillingManager();
  const parsed = checkoutSessionSchema.safeParse({
    companyId: formData.get("companyId"),
    packageId: formData.get("packageId"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Checkout request is invalid." };
  }

  const supabase = createServiceRoleClient();
  const [{ data: packageData, error: packageError }, { data: customer }, { data: company }] = await Promise.all([
    supabase
      .from("packages")
      .select("id, package_key, name, monthly_price, currency_code, billing_interval")
      .eq("id", parsed.data.packageId)
      .single(),
    supabase
      .from("billing_customers")
      .select("provider, provider_customer_id, billing_email, billing_name")
      .eq("company_id", workspace.companyId)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
    supabase.from("companies").select("name").eq("id", workspace.companyId).single(),
  ]);

  if (packageError || !packageData) {
    return { error: packageError?.message ?? "Package was not found." };
  }

  const env = validateRuntimeEnv();
  const metadata = buildCheckoutMetadata({
    companyId: workspace.companyId,
    packageKey: packageData.package_key,
    actorProfileId: workspace.profileId,
  });
  const session = await createStripeCheckoutSession({
    packageName: packageData.name,
    packageKey: packageData.package_key,
    amount: Number(packageData.monthly_price ?? 0),
    currency: packageData.currency_code,
    interval: packageData.billing_interval ?? "month",
    customerId: customer?.provider === "stripe" ? customer.provider_customer_id : null,
    customerEmail: customer?.billing_email ?? workspace.email,
    successUrl: `${env.NEXT_PUBLIC_APP_URL}/subscriptions?checkout=success`,
    cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/subscriptions?checkout=cancelled`,
    metadata,
  });

  await supabase.from("billing_events").insert({
    company_id: workspace.companyId,
    provider: session.provider,
    provider_event_id: session.providerSessionId,
    event_type: "checkout.session.created",
    event_status: session.simulated ? "processed" : "received",
    payload: { package_key: packageData.package_key, url: session.url, company_name: company?.name },
    processed_at: session.simulated ? new Date().toISOString() : null,
  });

  await writeAuditLog({
    companyId: workspace.companyId,
    actorProfileId: workspace.profileId,
    action: "create_checkout_session",
    entityType: "billing_checkout",
    newValues: { packageKey: packageData.package_key, provider: session.provider, simulated: session.simulated },
  });

  return {
    success: session.simulated ? "Local checkout session created." : "Stripe checkout session created.",
    url: session.url,
  };
}

export async function createCustomerPortalSession(formData: FormData): Promise<ActionResult> {
  const workspace = await requireBillingManager();
  const parsed = portalSessionSchema.safeParse({
    companyId: formData.get("companyId"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Portal request is invalid." };
  }

  const env = validateRuntimeEnv();
  const supabase = createServiceRoleClient();
  const { data: customer, error } = await supabase
    .from("billing_customers")
    .select("provider, provider_customer_id")
    .eq("company_id", workspace.companyId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!customer?.provider_customer_id) {
    return { error: "Create a billing customer before opening the portal." };
  }

  const session = await createStripePortalSession({
    customerId: customer.provider_customer_id,
    returnUrl: `${env.NEXT_PUBLIC_APP_URL}/subscriptions`,
  });

  await supabase.from("billing_events").insert({
    company_id: workspace.companyId,
    provider: session.provider,
    provider_event_id: session.providerSessionId,
    event_type: "billing_portal.session.created",
    event_status: "processed",
    payload: { url: session.url },
    processed_at: new Date().toISOString(),
  });

  await writeAuditLog({
    companyId: workspace.companyId,
    actorProfileId: workspace.profileId,
    action: "create_billing_portal_session",
    entityType: "billing_portal",
    newValues: { provider: session.provider, simulated: session.simulated },
  });

  return {
    success: session.simulated ? "Local billing portal session created." : "Stripe billing portal session created.",
    url: session.url,
  };
}
