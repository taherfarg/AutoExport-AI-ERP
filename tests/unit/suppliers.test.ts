import { describe, expect, test } from "vitest";
import {
  calculateSupplierAging,
  calculateSupplierFinancials,
  getSupplierRiskLevel,
} from "@/lib/suppliers/calculations";
import { formatSupplierCategory } from "@/lib/suppliers/format";
import { createSupplierSchema } from "@/lib/validations/suppliers";

describe("supplier calculations", () => {
  test("summarizes supplier balances across payables, expenses, and purchase orders", () => {
    const summary = calculateSupplierFinancials({
      payables: [
        { amount: 10000, paidAmount: 2500, balanceDue: 7500, dueDate: "2026-05-01", status: "open" },
        { amount: 5000, paidAmount: 5000, balanceDue: 0, dueDate: "2026-05-10", status: "paid" },
      ],
      expenses: [{ amount: 1200 }, { amount: 800 }],
      purchaseOrders: [
        { totalAmount: 9000, status: "ordered" },
        { totalAmount: 3000, status: "received" },
      ],
    });

    expect(summary.totalPayables).toBe(15000);
    expect(summary.openBalance).toBe(7500);
    expect(summary.totalExpenses).toBe(2000);
    expect(summary.openPurchaseOrderValue).toBe(9000);
    expect(summary.paidAmount).toBe(7500);
  });

  test("buckets supplier AP aging from an as-of date", () => {
    const aging = calculateSupplierAging(
      [
        { balanceDue: 1000, dueDate: "2026-05-22", status: "open" },
        { balanceDue: 2000, dueDate: "2026-05-10", status: "open" },
        { balanceDue: 3000, dueDate: "2026-04-12", status: "partial" },
        { balanceDue: 4000, dueDate: "2026-02-10", status: "open" },
        { balanceDue: 9999, dueDate: "2026-01-01", status: "paid" },
      ],
      "2026-05-22",
    );

    expect(aging.current).toBe(1000);
    expect(aging.days1To30).toBe(2000);
    expect(aging.days31To60).toBe(3000);
    expect(aging.days61Plus).toBe(4000);
    expect(aging.total).toBe(10000);
  });

  test("formats supplier categories and risk", () => {
    expect(formatSupplierCategory("parts")).toBe("Parts");
    expect(formatSupplierCategory("vehicle_supplier")).toBe("Vehicle Supplier");
    expect(getSupplierRiskLevel({ openBalance: 0, days61Plus: 0 })).toBe("low");
    expect(getSupplierRiskLevel({ openBalance: 5000, days61Plus: 0 })).toBe("medium");
    expect(getSupplierRiskLevel({ openBalance: 5000, days61Plus: 100 })).toBe("high");
  });
});

describe("supplier validation", () => {
  test("normalizes country, currency, category, and terms", () => {
    const supplier = createSupplierSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      supplierName: "  Gulf Parts LLC  ",
      category: "parts",
      countryCode: "ae",
      currencyCode: "aed",
      paymentTermsDays: 45,
      email: "parts@example.test",
    });

    expect(supplier.supplierName).toBe("Gulf Parts LLC");
    expect(supplier.countryCode).toBe("AE");
    expect(supplier.currencyCode).toBe("AED");
    expect(supplier.paymentTermsDays).toBe(45);
  });
});
