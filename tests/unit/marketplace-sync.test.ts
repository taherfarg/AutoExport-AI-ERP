import { describe, expect, test } from "vitest";
import {
  buildMarketplacePayload,
  hasMarketplaceContact,
  summarizeSyncJobs,
} from "@/lib/marketing/marketplace";

describe("marketplace sync helpers", () => {
  test("builds a channel-ready listing payload", () => {
    const payload = buildMarketplacePayload({
      listingNumber: "LST-001",
      title: "2026 Toyota Hilux GR Sport",
      price: 150000,
      currencyCode: "AED",
      channelKey: "dubizzle",
      vehicle: {
        stockNumber: "DXB-001",
        brand: "Toyota",
        model: "Hilux",
        year: 2026,
        mileage: 120,
        exportAvailable: true,
      },
      overridePrice: 147500,
      notes: "Ramadan campaign price",
    });

    expect(payload).toEqual({
      externalReference: "dubizzle-LST-001",
      title: "2026 Toyota Hilux GR Sport",
      price: 147500,
      currencyCode: "AED",
      channelKey: "dubizzle",
      notes: "Ramadan campaign price",
      vehicle: {
        stockNumber: "DXB-001",
        brand: "Toyota",
        model: "Hilux",
        year: 2026,
        mileage: 120,
        exportAvailable: true,
      },
    });
  });

  test("summarizes sync jobs by status", () => {
    expect(
      summarizeSyncJobs([
        { status: "queued" },
        { status: "completed" },
        { status: "failed" },
        { status: "completed" },
      ]),
    ).toEqual({
      total: 4,
      queued: 1,
      running: 0,
      completed: 2,
      failed: 1,
      cancelled: 0,
    });
  });

  test("requires at least one marketplace lead contact route", () => {
    expect(hasMarketplaceContact({ name: "Buyer only" })).toBe(false);
    expect(hasMarketplaceContact({ phone: "+971500000000" })).toBe(true);
    expect(hasMarketplaceContact({ email: "buyer@example.test" })).toBe(true);
    expect(hasMarketplaceContact({ whatsapp: "+971500000001" })).toBe(true);
  });
});
