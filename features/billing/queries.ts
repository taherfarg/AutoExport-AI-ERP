import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { calculateUsageStatus, mapPackageToUsageLimits, type UsageMetricKey } from "@/lib/billing/usage";

type PackageRow = {
  id: string;
  package_key: string;
  name: string;
  description: string;
  monthly_price: number | null;
  currency_code: string;
  max_branches: number | null;
  max_users: number | null;
  max_vehicles: number | null;
  max_ai_requests: number | null;
  stripe_price_id?: string | null;
  billing_interval?: string | null;
};

type SubscriptionRow = {
  id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  billing_customer_id: string | null;
  billing_subscription_id: string | null;
  packages: PackageRow | PackageRow[] | null;
};

export async function getBillingOverview(companyId: string) {
  const supabase = createServiceRoleClient();
  const [{ data: subscription, error: subscriptionError }, { data: packages }, { data: customer }, { data: counters }, { data: events }, { data: limitEvents }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select(
          "id, status, trial_ends_at, current_period_start, current_period_end, billing_customer_id, billing_subscription_id, packages(id, package_key, name, description, monthly_price, currency_code, max_branches, max_users, max_vehicles, max_ai_requests, stripe_price_id, billing_interval)",
        )
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .limit(1)
        .single(),
      supabase
        .from("packages")
        .select("id, package_key, name, description, monthly_price, currency_code, max_branches, max_users, max_vehicles, max_ai_requests, stripe_price_id, billing_interval")
        .order("monthly_price", { ascending: true }),
      supabase
        .from("billing_customers")
        .select("id, provider, provider_customer_id, billing_email, billing_name, status, default_currency_code, created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("usage_counters")
        .select("id, metric_key, period_start, period_end, current_value, limit_value, source_table, refreshed_at")
        .eq("company_id", companyId)
        .order("metric_key", { ascending: true }),
      supabase
        .from("billing_events")
        .select("id, provider, provider_event_id, event_type, event_status, processed_at, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("usage_limit_events")
        .select("id, metric_key, event_type, current_value, limit_value, message, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (subscriptionError || !subscription) {
    throw new Error(subscriptionError?.message ?? "Subscription was not found.");
  }

  const typedSubscription = subscription as unknown as SubscriptionRow;
  const packageData = (Array.isArray(typedSubscription.packages)
    ? typedSubscription.packages[0]
    : typedSubscription.packages) as PackageRow | null;

  if (!packageData) {
    throw new Error("Subscription package was not found.");
  }

  const packageLimits = mapPackageToUsageLimits({
    packageKey: packageData.package_key,
    maxBranches: packageData.max_branches,
    maxUsers: packageData.max_users,
    maxVehicles: packageData.max_vehicles,
    maxAiRequests: packageData.max_ai_requests,
  });

  const usageCounters = (counters ?? []).map((counter) => {
    const metricKey = counter.metric_key as UsageMetricKey;
    const currentValue = Number(counter.current_value);
    const limitValue = counter.limit_value === null ? packageLimits[metricKey] ?? null : Number(counter.limit_value);

    return {
      ...counter,
      current_value: currentValue,
      limit_value: limitValue,
      usage: calculateUsageStatus(currentValue, limitValue),
    };
  });

  return {
    subscription: typedSubscription,
    packageData,
    packages: (packages ?? []) as PackageRow[],
    billingCustomer: customer,
    usageCounters,
    billingEvents: events ?? [],
    usageLimitEvents: limitEvents ?? [],
  };
}
