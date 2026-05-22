import { CreditCard, Lock, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getBillingOverview } from "@/features/billing/queries";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { MODULE_REGISTRY } from "@/lib/modules/module-registry";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { usageMetricLabels } from "@/lib/billing/usage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BillingCustomerForm,
  CheckoutSessionForm,
  PortalSessionForm,
  UsageRefreshForm,
} from "./billing-action-forms";

function formatLimit(value: number | null | undefined) {
  return value === null || value === undefined ? "Unlimited" : Intl.NumberFormat("en").format(value);
}

function formatMoney(amount: number | null, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function statusBadge(status: string) {
  if (status === "blocked" || status === "past_due" || status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "warning" || status === "trialing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

type SubscriptionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams;
  const lockedModuleKey = firstParam(params.locked);
  const returnTo = firstParam(params.returnTo);
  const lockedModule = lockedModuleKey
    ? MODULE_REGISTRY.find((module) => module.key === lockedModuleKey)
    : undefined;
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);
  const canManageBilling = permissions.has(PERMISSIONS.MANAGE_SUBSCRIPTIONS);
  const canViewBilling = canManageBilling || permissions.has(PERMISSIONS.VIEW_BILLING);

  if (!canViewBilling) {
    return (
      <div className="space-y-6">
        <Card className="border-red-100 bg-red-50/40">
          <CardHeader>
            <CardTitle>Billing access required</CardTitle>
            <CardDescription>
              Ask an administrator for billing visibility before viewing subscription and usage data.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const overview = await getBillingOverview(workspace.companyId);
  const currentPackageKey = overview.packageData.package_key;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Subscription & Billing</h2>
          <p className="text-sm text-slate-500">
            Stripe-ready checkout, customer portal, package access, and usage limit enforcement.
          </p>
        </div>
        <Badge className={statusBadge(overview.subscription.status)}>{overview.subscription.status}</Badge>
      </div>

      {lockedModule ? (
        <Card className="border-orange-200 bg-orange-50/70">
          <CardHeader className="space-y-3 md:flex md:flex-row md:items-start md:justify-between md:space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-orange-950">
                <Lock className="h-5 w-5 text-orange-600" />
                {lockedModule.label} is not included in your current package.
              </CardTitle>
              <CardDescription className="mt-2 text-orange-900/80">
                Upgrade the package or ask an administrator to change module access before opening this workspace area.
              </CardDescription>
            </div>
            {returnTo ? (
              <Button asChild variant="outline" className="border-orange-300 bg-white text-orange-900 hover:bg-orange-100">
                <Link href={returnTo}>Try again after upgrade</Link>
              </Button>
            ) : null}
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Current package
            </CardTitle>
            <CardDescription>{overview.packageData.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-slate-500">Plan</p>
              <p className="text-lg font-semibold text-slate-950">{overview.packageData.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Monthly</p>
              <p className="text-lg font-semibold text-slate-950">
                {formatMoney(Number(overview.packageData.monthly_price ?? 0), overview.packageData.currency_code)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Branches</p>
              <p className="font-medium text-slate-900">{formatLimit(overview.packageData.max_branches)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Vehicles</p>
              <p className="font-medium text-slate-900">{formatLimit(overview.packageData.max_vehicles)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              Billing customer
            </CardTitle>
            <CardDescription>
              {overview.billingCustomer
                ? `${overview.billingCustomer.provider} customer ${overview.billingCustomer.provider_customer_id}`
                : "Create a billing customer before portal access."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManageBilling ? (
              <>
                <BillingCustomerForm
                  companyId={workspace.companyId}
                  defaultEmail={overview.billingCustomer?.billing_email ?? workspace.email}
                  defaultName={overview.billingCustomer?.billing_name ?? "AutoSphere dealership"}
                  defaultCurrencyCode={overview.billingCustomer?.default_currency_code ?? overview.packageData.currency_code}
                />
                <PortalSessionForm companyId={workspace.companyId} />
              </>
            ) : (
              <p className="text-sm text-slate-500">Billing management requires subscription permissions.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Usage counters
            </CardTitle>
            <CardDescription>Usage is refreshed into auditable counters for package enforcement.</CardDescription>
          </div>
          {canManageBilling ? <UsageRefreshForm companyId={workspace.companyId} /> : null}
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {overview.usageCounters.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-slate-500 md:col-span-3">
              No counters yet. Refresh usage to calculate package consumption.
            </div>
          ) : (
            overview.usageCounters.map((counter) => (
              <div key={counter.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">
                    {usageMetricLabels[counter.metric_key as keyof typeof usageMetricLabels] ?? counter.metric_key}
                  </p>
                  <Badge className={statusBadge(counter.usage.status)}>{counter.usage.status}</Badge>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatLimit(counter.current_value)}
                  <span className="text-sm font-normal text-slate-500"> / {formatLimit(counter.limit_value)}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {counter.usage.percentage === null ? "Unlimited package metric" : `${counter.usage.percentage}% used`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {overview.packages.map((packageOption) => {
          const current = packageOption.package_key === currentPackageKey;
          return (
            <Card key={packageOption.id} className={current ? "border-blue-200 bg-blue-50/30" : undefined}>
              <CardHeader>
                <CardTitle>{packageOption.name}</CardTitle>
                <CardDescription>{packageOption.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-2xl font-semibold text-slate-950">
                  {formatMoney(Number(packageOption.monthly_price ?? 0), packageOption.currency_code)}
                </p>
                <div className="space-y-1 text-slate-600">
                  <p>Branches: {formatLimit(packageOption.max_branches)}</p>
                  <p>Users: {formatLimit(packageOption.max_users)}</p>
                  <p>Vehicles: {formatLimit(packageOption.max_vehicles)}</p>
                  <p>AI requests: {formatLimit(packageOption.max_ai_requests)}</p>
                </div>
                {canManageBilling ? (
                  <CheckoutSessionForm
                    companyId={workspace.companyId}
                    packageId={packageOption.id}
                    current={current}
                    label={current ? "Current package" : `Upgrade to ${packageOption.name}`}
                  />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing event ledger</CardTitle>
            <CardDescription>Recent checkout, portal, invoice, and webhook events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {overview.billingEvents.length === 0 ? (
              <p className="text-slate-500">No billing events yet.</p>
            ) : (
              overview.billingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-950">{event.event_type}</p>
                    <p className="text-xs text-slate-500">{event.provider_event_id}</p>
                  </div>
                  <Badge className={statusBadge(event.event_status)}>{event.event_status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-slate-600" />
              Locked module guidance
            </CardTitle>
            <CardDescription>When a module is locked, the sidebar sends users here to upgrade.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {overview.usageLimitEvents.length === 0 ? (
              <p className="text-slate-500">No usage limit warnings recorded.</p>
            ) : (
              overview.usageLimitEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p className="font-medium">{event.message}</p>
                  <p className="text-xs">
                    {event.metric_key}: {formatLimit(event.current_value)} / {formatLimit(event.limit_value)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
