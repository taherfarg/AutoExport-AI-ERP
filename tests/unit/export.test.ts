import { describe, expect, test } from "vitest";
import {
  calculateShipmentCostSummary,
  getExportDocumentCompletion,
  getExportRiskFlags,
  type ExportDocumentStatusInput,
  type ShipmentCostInput,
} from "@/lib/export/calculations";
import { formatExportStatus } from "@/lib/export/format";
import { createExportOrderSchema, createImportOrderSchema, createShippingEventSchema } from "@/lib/validations/export";

describe("export operations", () => {
  test("summarizes shipment costs by currency and total count", () => {
    const costs: ShipmentCostInput[] = [
      { amount: 8500, currency_code: "AED" },
      { amount: 1200, currency_code: "AED" },
      { amount: 400, currency_code: "USD" },
    ];

    expect(calculateShipmentCostSummary(costs)).toEqual({
      count: 3,
      totalsByCurrency: [
        { currencyCode: "AED", amount: 9700 },
        { currencyCode: "USD", amount: 400 },
      ],
    });
  });

  test("calculates required export document completion", () => {
    const documents: ExportDocumentStatusInput[] = [
      { is_required: true, status: "verified" },
      { is_required: true, status: "uploaded" },
      { is_required: true, status: "missing" },
      { is_required: false, status: "missing" },
    ];

    expect(getExportDocumentCompletion(documents)).toEqual({
      requiredCount: 3,
      completedCount: 2,
      missingCount: 1,
      completionPercentage: 67,
    });
  });

  test("derives operational risk flags for delayed shipments and missing documents", () => {
    expect(
      getExportRiskFlags({
        shippingStatus: "waiting_booking",
        customsStatus: "pending_documents",
        documentStatus: "missing",
        estimatedArrivalDate: "2026-05-10",
        today: "2026-05-19",
      }),
    ).toEqual(["missing_documents", "shipment_delayed", "customs_pending_documents"]);
  });

  test("formats export statuses for badges and timelines", () => {
    expect(formatExportStatus("under_clearance")).toBe("Under clearance");
    expect(formatExportStatus("vehicle_delivered_to_port")).toBe("Vehicle delivered to port");
  });

  test("validates export order and shipping event payloads", () => {
    expect(
      createExportOrderSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        vehicleId: "33333333-3333-4333-8333-333333333333",
        customerId: "44444444-4444-4444-8444-444444444444",
        destinationCountryCode: "dz",
        destinationPort: "Algiers",
        shippingMethod: "container",
        estimatedDepartureDate: "2026-06-01",
        estimatedArrivalDate: "2026-06-20",
      }),
    ).toMatchObject({
      destinationCountryCode: "DZ",
      destinationPort: "Algiers",
      shippingMethod: "container",
    });

    expect(
      createShippingEventSchema.parse({
        exportOrderId: "55555555-5555-4555-8555-555555555555",
        eventStatus: "booked",
        eventDate: "2026-06-01T10:00:00.000Z",
        location: "Jebel Ali",
      }),
    ).toMatchObject({
      eventStatus: "booked",
      location: "Jebel Ali",
    });
  });

  test("validates import order payloads", () => {
    expect(
      createImportOrderSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        supplierName: "Belgium Auto Supplier",
        originCountryCode: "be",
        originPort: "Antwerp",
        destinationCountryCode: "ae",
        destinationPort: "Jebel Ali",
        shippingMethod: "ro_ro",
        vehicleCount: 3,
      }),
    ).toMatchObject({
      originCountryCode: "BE",
      destinationCountryCode: "AE",
      vehicleCount: 3,
    });
  });
});
