import { describe, expect, test } from "vitest";
import {
  calculateInspectionScore,
  calculateJobLaborAmount,
  calculateServiceOrderTotals,
  calculateWarrantyClaimBalance,
} from "@/lib/service/calculations";
import { formatServiceStatus, makeServiceNumber } from "@/lib/service/format";
import {
  createInspectionResultSchema,
  createServiceJobSchema,
  createServiceOrderSchema,
  createWarrantyClaimSchema,
} from "@/lib/validations/service";

describe("service workshop calculations", () => {
  test("calculates service order totals from labor and parts", () => {
    expect(calculateServiceOrderTotals({ laborTotal: 850, partsTotal: 1200 })).toEqual({
      laborTotal: 850,
      partsTotal: 1200,
      totalAmount: 2050,
    });
  });

  test("calculates job labor and warranty balance", () => {
    expect(calculateJobLaborAmount({ hours: 2.5, hourlyRate: 180 })).toBe(450);
    expect(calculateWarrantyClaimBalance({ claimAmount: 3000, approvedAmount: 2500, paidAmount: 1000 })).toEqual({
      approvedBalance: 1500,
      unapprovedAmount: 500,
    });
  });

  test("calculates inspection score from result statuses", () => {
    expect(calculateInspectionScore(["pass", "pass", "attention", "fail"])).toBe(63);
  });
});

describe("service validation", () => {
  test("validates service order and job payloads", () => {
    const order = createServiceOrderSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      vehicleId: "00000000-0000-4000-8000-000000000003",
      title: "Brake vibration diagnosis",
      complaint: "Brake vibration at speed",
      odometer: 25000,
      currencyCode: "aed",
    });

    expect(order.currencyCode).toBe("AED");
    expect(order.priority).toBe("normal");

    const job = createServiceJobSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      serviceOrderId: "00000000-0000-4000-8000-000000000004",
      title: "Brake diagnosis",
      estimatedHours: 1.5,
      laborRate: 180,
    });

    expect(job.laborAmount).toBe(270);
  });

  test("validates inspection and warranty payloads", () => {
    const inspection = createInspectionResultSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      serviceOrderId: "00000000-0000-4000-8000-000000000003",
      overallStatus: "attention",
      scorePercent: 82,
      results: "{\"brakes\":\"attention\"}",
    });

    expect(inspection.results).toEqual({ brakes: "attention" });

    const claim = createWarrantyClaimSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      providerName: "Factory Warranty",
      claimAmount: 3000,
      approvedAmount: 2500,
      paidAmount: 1000,
      currencyCode: "AED",
    });

    expect(claim.claimBalance.approvedBalance).toBe(1500);
  });
});

describe("service formatting", () => {
  test("formats service status and numbers", () => {
    expect(formatServiceStatus("quality_check")).toBe("Quality Check");
    expect(makeServiceNumber("SO")).toMatch(/^SO-/);
  });
});
