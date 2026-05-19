import { describe, expect, it } from "vitest";
import {
  buildChatPreview,
  calculateOperationsReportSummary,
  groupRowsByLabel,
} from "@/lib/operations/reports";
import { formatOperationsStatus, priorityWeight } from "@/lib/operations/format";
import {
  createAlertSchema,
  createChatMessageSchema,
  createReportExportSchema,
  createTaskSchema,
} from "@/lib/validations/operations";

describe("operations reports", () => {
  it("calculates stock, sales, profit, export, and marketing summary metrics", () => {
    const summary = calculateOperationsReportSummary({
      vehicles: [
        { status: "available", sellingPrice: 150000, totalLandedCost: 120000, branchName: "Dubai" },
        { status: "reserved", sellingPrice: 180000, totalLandedCost: 140000, branchName: "Dubai" },
        { status: "sold", sellingPrice: 210000, totalLandedCost: 160000, branchName: "Doha" },
      ],
      invoices: [
        { total: 210000, paidAmount: 150000, balanceDue: 60000 },
        { total: 90000, paidAmount: 90000, balanceDue: 0 },
      ],
      exportOrders: [{ status: "active" }, { status: "delayed" }],
      leads: [{ status: "new", source: "instagram" }, { status: "won", source: "website" }],
      campaigns: [{ spend: 1000, leads: 10 }, { spend: 500, leads: 5 }],
    });

    expect(summary.totalVehicles).toBe(3);
    expect(summary.availableVehicles).toBe(1);
    expect(summary.salesTotal).toBe(300000);
    expect(summary.pendingPayments).toBe(60000);
    expect(summary.expectedProfit).toBe(120000);
    expect(summary.delayedExports).toBe(1);
    expect(summary.marketingCostPerLead).toBe(100);
  });

  it("groups rows by label and sorts by highest count", () => {
    const groups = groupRowsByLabel(
      [
        { branchName: "Dubai" },
        { branchName: "Dubai" },
        { branchName: "Doha" },
      ],
      "branchName",
    );

    expect(groups).toEqual([
      { label: "Dubai", count: 2 },
      { label: "Doha", count: 1 },
    ]);
  });

  it("formats status text, priority weights, and chat previews", () => {
    expect(formatOperationsStatus("in_progress")).toBe("In progress");
    expect(priorityWeight("critical")).toBeGreaterThan(priorityWeight("medium"));
    expect(buildChatPreview("Customer asked for export documents and payment confirmation.", 32)).toBe("Customer asked for export documents...");
  });
});

describe("operations validation", () => {
  it("validates report export, alert, task, and message inputs", () => {
    expect(createReportExportSchema.parse({
      companyId: "11111111-1111-4111-8111-111111111111",
      reportType: "inventory",
      exportFormat: "csv",
    }).exportFormat).toBe("csv");

    expect(createAlertSchema.parse({
      companyId: "11111111-1111-4111-8111-111111111111",
      title: "Payment overdue",
      alertType: "customer_payment_overdue",
      priority: "high",
    }).status).toBe("open");

    expect(createTaskSchema.parse({
      companyId: "11111111-1111-4111-8111-111111111111",
      title: "Call customer",
      priority: "medium",
    }).status).toBe("open");

    expect(createChatMessageSchema.safeParse({
      companyId: "11111111-1111-4111-8111-111111111111",
      threadId: "22222222-2222-4222-8222-222222222222",
      body: "",
    }).success).toBe(false);
  });
});
