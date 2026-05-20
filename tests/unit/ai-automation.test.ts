import { describe, expect, test } from "vitest";
import { parseOcrFields, compileProposalPayload } from "@/lib/ai/automation-helpers";
import {
  automationAgentSchema,
  documentExtractionSchema,
  automationProposalSchema,
} from "@/lib/validations/ai";

describe("Phase 20: Advanced AI Automation business heuristics & Zod validation", () => {
  describe("OCR Regex Parsers", () => {
    test("parses vehicle_title correctly with high-fidelity regex heuristics", () => {
      const titleText = `
        STATE OF CALIFORNIA - CERTIFICATE OF TITLE
        TITLE NO: 987654321
        VIN: 1FTFW1EF5GFA99999
        YEAR: 2016
        MAKE: FORD
        MODEL: F-150 SUPERCREW
        BODY: PICKUP
        COLOR: BLACK
      `;

      const parsed = parseOcrFields("vehicle_title", titleText);
      expect(parsed).toEqual({
        vin: "1FTFW1EF5GFA99999",
        make: "Ford",
        model: "F-150 SUPERCREW",
        year: 2016,
        color: "Black",
      });
    });

    test("falls back gracefully for vehicle_title with partial information", () => {
      const partialText = "YEAR: 2020. BRAND: TOYOTA. COLOR: RED.";
      const parsed = parseOcrFields("vehicle_title", partialText);
      expect(parsed).toEqual({
        vin: null,
        make: "Toyota",
        model: null,
        year: 2020,
        color: "Red",
      });
    });

    test("parses supplier_invoice correctly with high-fidelity regex heuristics", () => {
      const invoiceText = `
        INVOICE
        SUPPLIER: AutoParts Depot Ltd
        INVOICE #: INV-2026-0520
        DATE: May 20, 2026
        PART NUMBER: BP-202X
        DESCRIPTION: Heavy-Duty Front Brake Pads
        QTY: 25
        UNIT COST: 120.00
        TOTAL AMOUNT DUE: AED 3,000.00
      `;

      const parsed = parseOcrFields("supplier_invoice", invoiceText);
      expect(parsed).toEqual({
        supplierName: "AutoParts Depot Ltd",
        invoiceNumber: "INV-2026-0520",
        amount: 3000,
        partNumber: "BP-202X",
        partName: "Heavy-Duty Front Brake Pads",
        quantity: 25,
      });
    });
  });

  describe("Proposal Payload Compilers", () => {
    test("compiles crm lead follow up proposals with defaults", () => {
      const data = {
        leadId: "44444444-4444-4444-8444-444444444444",
        messageBody: "Hi John, we received your inquiry about the BMW X5.",
      };
      const compiled = compileProposalPayload("lead_follow_up", data);
      expect(compiled).toMatchObject({
        leadId: "44444444-4444-4444-8444-444444444444",
        messageChannel: "whatsapp",
        messageBody: "Hi John, we received your inquiry about the BMW X5.",
        campaignName: "Autonomous Lead Nurturing",
      });
      expect(compiled.scheduledAt).toBeDefined();
    });

    test("compiles parts reorder proposals with defaults", () => {
      const data = {
        partNumber: "BP-202X",
        supplierName: "AutoParts Depot Ltd",
        quantity: 50,
      };
      const compiled = compileProposalPayload("parts_reorder", data);
      expect(compiled).toEqual({
        partId: null,
        partNumber: "BP-202X",
        partName: "",
        supplierId: null,
        supplierName: "AutoParts Depot Ltd",
        quantity: 50,
        estimatedUnitCost: 0,
        currencyCode: "AED",
      });
    });
  });

  describe("Zod Validation Schemas", () => {
    test("validates automationAgentSchema successfully", () => {
      const validAgent = {
        companyId: "11111111-1111-4111-8111-111111111111",
        agentType: "parts_reorder",
        isEnabled: true,
        config: { threshold: 10 },
      };
      expect(automationAgentSchema.parse(validAgent)).toEqual(validAgent);
    });

    test("validates documentExtractionSchema successfully", () => {
      const validDoc = {
        companyId: "11111111-1111-4111-8111-111111111111",
        filePath: "uploads/invoice.pdf",
        fileName: "invoice.pdf",
        fileType: "application/pdf",
        documentType: "supplier_invoice",
        status: "pending",
        extractedData: { amount: 3000 },
      };
      expect(documentExtractionSchema.parse(validDoc)).toMatchObject(validDoc);
    });

    test("validates automationProposalSchema successfully", () => {
      const validProposal = {
        companyId: "11111111-1111-4111-8111-111111111111",
        proposalType: "parts_reorder",
        title: "Reorder Brake Pads",
        description: "Reorder front brake pads",
        justification: "Front brake pad stock is low (below 5 units)",
        proposedPayload: { qty: 25 },
        status: "pending",
      };
      expect(automationProposalSchema.parse(validProposal)).toMatchObject(validProposal);
    });
  });
});
