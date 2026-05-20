export const usageMetricLabels = {
  branches: "Branches",
  users: "Users",
  vehicles: "Vehicles",
  ai_requests: "AI requests",
  marketing_listings: "Marketing listings",
  export_orders: "Export orders",
  storage_mb: "Storage",
} as const;

export type UsageMetricKey = keyof typeof usageMetricLabels;
export type UsageStatus = "ok" | "warning" | "blocked" | "unlimited";

export type PackageLimitSource = {
  packageKey: string;
  maxBranches: number | null;
  maxUsers: number | null;
  maxVehicles: number | null;
  maxAiRequests: number | null;
};

export function mapPackageToUsageLimits(packageData: PackageLimitSource) {
  return {
    branches: packageData.maxBranches,
    users: packageData.maxUsers,
    vehicles: packageData.maxVehicles,
    ai_requests: packageData.maxAiRequests,
    marketing_listings: null,
    export_orders: null,
    storage_mb: null,
  } satisfies Record<UsageMetricKey, number | null>;
}

export function getPackageLimitForMetric(packageData: PackageLimitSource, metricKey: UsageMetricKey) {
  return mapPackageToUsageLimits(packageData)[metricKey];
}

export function calculateUsageStatus(currentValue: number, limitValue: number | null) {
  if (limitValue === null) {
    return {
      status: "unlimited" as const,
      percentage: null,
      remaining: null,
      isLimited: false,
    };
  }

  const safeLimit = Math.max(limitValue, 0);
  const percentage = safeLimit === 0 ? (currentValue > 0 ? 100 : 0) : Math.round((currentValue / safeLimit) * 100);
  const remaining = Math.max(safeLimit - currentValue, 0);
  const status: UsageStatus = currentValue > safeLimit ? "blocked" : percentage >= 85 ? "warning" : "ok";

  return {
    status,
    percentage,
    remaining,
    isLimited: true,
  };
}

export function buildCheckoutMetadata({
  companyId,
  packageKey,
  actorProfileId,
}: {
  companyId: string;
  packageKey: string;
  actorProfileId: string;
}) {
  return {
    company_id: companyId,
    package_key: packageKey,
    actor_profile_id: actorProfileId,
    product: "autosphere_erp",
  };
}

export function normalizeUsageMetricKey(metricKey: string): UsageMetricKey | null {
  return metricKey in usageMetricLabels ? (metricKey as UsageMetricKey) : null;
}
