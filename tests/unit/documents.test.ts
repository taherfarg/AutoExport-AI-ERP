import { describe, expect, test } from "vitest";
import {
  calculateChecklistCompletion,
  getDocumentExpiryState,
  getMissingRequiredDocuments,
  type DocumentChecklistInput,
} from "@/lib/documents/calculations";
import { formatDocumentStatus, makeDocumentNumber, makeSignatureRequestNumber } from "@/lib/documents/format";
import {
  createDocumentSchema,
  createSignatureRequestSchema,
  signDocumentSchema,
  verifyDocumentSchema,
} from "@/lib/validations/documents";

describe("documents and signature workflow", () => {
  test("calculates checklist completion for required documents", () => {
    const checklist: DocumentChecklistInput[] = [
      { category: "vehicle_title", is_required: true, status: "verified" },
      { category: "insurance", is_required: true, status: "uploaded" },
      { category: "inspection_report", is_required: true, status: "missing" },
      { category: "other", is_required: false, status: "missing" },
    ];

    expect(calculateChecklistCompletion(checklist)).toEqual({
      requiredCount: 3,
      completedCount: 2,
      missingCount: 1,
      completionPercentage: 67,
    });
  });

  test("returns missing required document categories", () => {
    expect(
      getMissingRequiredDocuments([
        { category: "vehicle_title", is_required: true, status: "verified" },
        { category: "bill_of_lading", is_required: true, status: "missing" },
        { category: "insurance", is_required: true, status: "expired" },
      ]),
    ).toEqual(["bill_of_lading", "insurance"]);
  });

  test("derives document expiry state from expiry date", () => {
    expect(getDocumentExpiryState({ expiresAt: "2026-05-10", today: "2026-05-19" })).toBe("expired");
    expect(getDocumentExpiryState({ expiresAt: "2026-05-25", today: "2026-05-19", warningDays: 10 })).toBe(
      "expiring_soon",
    );
    expect(getDocumentExpiryState({ expiresAt: "2026-07-01", today: "2026-05-19", warningDays: 10 })).toBe("valid");
    expect(getDocumentExpiryState({ expiresAt: null, today: "2026-05-19" })).toBe("no_expiry");
  });

  test("formats document and signature statuses", () => {
    expect(formatDocumentStatus("customer_id_passport")).toBe("Customer ID/passport");
    expect(formatDocumentStatus("waiting_signature")).toBe("Waiting signature");
  });

  test("creates stable document and signature numbers", () => {
    expect(makeDocumentNumber("DOC", 123456)).toBe("DOC-2N9C");
    expect(makeSignatureRequestNumber(123456)).toBe("SIG-2N9C");
  });

  test("validates document, verification, and signature payloads", () => {
    expect(
      createDocumentSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        category: "vehicle_title",
        title: "Toyota Hilux title",
        storageBucket: "documents",
        storagePath: "11111111-1111-4111-8111-111111111111/vehicles/title.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        expiresAt: "2026-12-31",
        entityType: "vehicle",
        entityId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toMatchObject({
      category: "vehicle_title",
      storageBucket: "documents",
      documentNumber: expect.stringMatching(/^DOC-/),
    });

    expect(
      verifyDocumentSchema.parse({
        documentId: "44444444-4444-4444-8444-444444444444",
        status: "verified",
        notes: "Original title confirmed",
      }),
    ).toMatchObject({ status: "verified" });

    expect(
      createSignatureRequestSchema.parse({
        companyId: "11111111-1111-4111-8111-111111111111",
        branchId: "22222222-2222-4222-8222-222222222222",
        documentType: "reservation_agreement",
        title: "Reservation agreement",
        relatedCustomerId: "55555555-5555-4555-8555-555555555555",
        relatedVehicleId: "66666666-6666-4666-8666-666666666666",
        sentToName: "Algeria Auto Dealer",
        sentToEmail: "buyer@example.com",
      }),
    ).toMatchObject({
      documentType: "reservation_agreement",
      requestNumber: expect.stringMatching(/^SIG-/),
    });

    expect(
      signDocumentSchema.parse({
        signatureRequestId: "77777777-7777-4777-8777-777777777777",
        signedByName: "Algeria Auto Dealer",
        signatureImagePath: "11111111-1111-4111-8111-111111111111/signatures/sig.png",
        signedDocumentPath: "11111111-1111-4111-8111-111111111111/signed/reservation.pdf",
      }),
    ).toMatchObject({ signedByName: "Algeria Auto Dealer" });
  });
});
