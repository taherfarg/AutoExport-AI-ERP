import { describe, expect, test } from "vitest";
import {
  calculatePartLineTotals,
  calculatePartProfit,
  calculatePartStockStatus,
  calculatePurchaseOrderTotals,
  shouldCreateReorderAlert,
} from "@/lib/parts/calculations";
import { formatPartStatus, makePartsNumber } from "@/lib/parts/format";
import {
  createPartPurchaseOrderItemSchema,
  createPartSchema,
  createServicePartLineSchema,
} from "@/lib/validations/parts";

describe("parts inventory calculations", () => {
  test("calculates branch stock status from available quantity and reorder point", () => {
    expect(calculatePartStockStatus({ quantityOnHand: 0, quantityReserved: 0, reorderPoint: 3 })).toBe("out_of_stock");
    expect(calculatePartStockStatus({ quantityOnHand: 5, quantityReserved: 3, reorderPoint: 3 })).toBe("low_stock");
    expect(calculatePartStockStatus({ quantityOnHand: 10, quantityReserved: 2, reorderPoint: 3 })).toBe("in_stock");
  });

  test("calculates service part line totals and profit", () => {
    expect(calculatePartLineTotals({ quantity: 3, unitCost: 120, sellingPrice: 185 })).toEqual({
      lineCost: 360,
      lineTotal: 555,
      grossProfit: 195,
    });

    expect(calculatePartProfit({ revenue: 555, cost: 360 })).toEqual({
      grossProfit: 195,
      marginPercent: 35.14,
    });
  });

  test("calculates purchase order totals and reorder alert rules", () => {
    expect(calculatePurchaseOrderTotals([
      { quantity: 2, unitCost: 150 },
      { quantity: 4, unitCost: 75 },
    ])).toEqual({ subtotal: 600, totalAmount: 600 });

    expect(shouldCreateReorderAlert({ availableQuantity: 2, reorderPoint: 3 })).toBe(true);
    expect(shouldCreateReorderAlert({ availableQuantity: 7, reorderPoint: 3 })).toBe(false);
  });
});

describe("parts validation", () => {
  test("normalizes catalog and purchase order item payloads", () => {
    const part = createPartSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      partNumber: "  lx-filter-001 ",
      name: "LX 600 Oil Filter",
      category: "Engine",
      unitCost: 120,
      sellingPrice: 185,
      currencyCode: "aed",
      reorderPoint: 3,
      reorderQuantity: 10,
    });

    expect(part.partNumber).toBe("LX-FILTER-001");
    expect(part.currencyCode).toBe("AED");

    const item = createPartPurchaseOrderItemSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      purchaseOrderId: "00000000-0000-4000-8000-000000000002",
      partId: "00000000-0000-4000-8000-000000000003",
      description: "LX 600 Oil Filter",
      quantityOrdered: 5,
      unitCost: 120,
    });

    expect(item.lineTotal).toBe(600);
  });

  test("normalizes service part line payloads", () => {
    const line = createServicePartLineSchema.parse({
      companyId: "00000000-0000-4000-8000-000000000001",
      branchId: "00000000-0000-4000-8000-000000000002",
      serviceOrderId: "00000000-0000-4000-8000-000000000003",
      partId: "00000000-0000-4000-8000-000000000004",
      description: "Oil filter replacement",
      quantity: 2,
      unitCost: 120,
      sellingPrice: 185,
    });

    expect(line.totals).toEqual({ lineCost: 240, lineTotal: 370, grossProfit: 130 });
  });
});

describe("parts formatting", () => {
  test("formats status and generated numbers", () => {
    expect(formatPartStatus("low_stock")).toBe("Low Stock");
    expect(makePartsNumber("PO")).toMatch(/^PO-/);
  });
});
