import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildCheckoutMetadata,
  calculateUsageStatus,
  getPackageLimitForMetric,
  mapPackageToUsageLimits,
} from "@/lib/billing/usage";
import { verifyStripeWebhookSignature } from "@/lib/billing/stripe";

const packageRow = {
  packageKey: "showroom_pro",
  maxBranches: 3,
  maxUsers: 10,
  maxVehicles: 500,
  maxAiRequests: 1000,
};

describe("billing usage logic", () => {
  it("maps package limits to usage metrics", () => {
    const limits = mapPackageToUsageLimits(packageRow);

    expect(limits.branches).toBe(3);
    expect(limits.users).toBe(10);
    expect(limits.vehicles).toBe(500);
    expect(limits.ai_requests).toBe(1000);
    expect(limits.marketing_listings).toBeNull();
  });

  it("calculates warning and blocked usage states", () => {
    expect(calculateUsageStatus(74, 100)).toMatchObject({ status: "ok", percentage: 74 });
    expect(calculateUsageStatus(90, 100)).toMatchObject({ status: "warning", percentage: 90 });
    expect(calculateUsageStatus(101, 100)).toMatchObject({ status: "blocked", percentage: 101 });
    expect(calculateUsageStatus(999, null)).toMatchObject({ status: "unlimited", percentage: null });
  });

  it("returns metric-specific package limits", () => {
    expect(getPackageLimitForMetric(packageRow, "vehicles")).toBe(500);
    expect(getPackageLimitForMetric(packageRow, "storage_mb")).toBeNull();
  });

  it("builds safe checkout metadata", () => {
    const metadata = buildCheckoutMetadata({
      companyId: "company-1",
      packageKey: "export_business",
      actorProfileId: "profile-1",
    });

    expect(metadata).toEqual({
      company_id: "company-1",
      package_key: "export_business",
      actor_profile_id: "profile-1",
      product: "autosphere_erp",
    });
  });
});

describe("Stripe webhook verification", () => {
  it("validates a Stripe-style signed payload", () => {
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({ id: "evt_test", type: "invoice.paid" });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`, "utf8")
      .digest("hex");

    expect(verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`, secret)).toBe(true);
    expect(verifyStripeWebhookSignature(payload, `t=${timestamp},v1=bad`, secret)).toBe(false);
  });
});
