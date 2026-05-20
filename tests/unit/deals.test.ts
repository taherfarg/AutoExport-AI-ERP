import { describe, expect, it } from "vitest";
import {
  calculateDealStructure,
  calculateFinanceAmount,
  calculateFiGross,
  calculateMonthlyPayment,
} from "@/lib/deals/calculations";

describe("deal desk calculations", () => {
  it("calculates zero-interest monthly payments with balloon amount", () => {
    expect(calculateMonthlyPayment({ principal: 120000, annualRate: 0, termMonths: 60, balloonPayment: 12000 })).toBe(1800);
  });

  it("calculates amortized monthly payments", () => {
    expect(calculateMonthlyPayment({ principal: 180000, annualRate: 4.5, termMonths: 60, balloonPayment: 0 })).toBe(3355.74);
  });

  it("calculates finance amount after down payment and trade-in", () => {
    expect(
      calculateFinanceAmount({
        vehiclePrice: 210000,
        productTotal: 8000,
        downPayment: 30000,
        tradeInValue: 15000,
      }),
    ).toBe(173000);
  });

  it("does not return negative finance amounts", () => {
    expect(calculateFinanceAmount({ vehiclePrice: 50000, productTotal: 0, downPayment: 60000, tradeInValue: 0 })).toBe(0);
  });

  it("calculates F&I gross from accepted products", () => {
    expect(
      calculateFiGross([
        { sellingPrice: 3500, costAmount: 2800, status: "accepted" },
        { sellingPrice: 4500, costAmount: 3000, status: "quoted" },
        { sellingPrice: 900, costAmount: 400, status: "accepted" },
      ]),
    ).toBe(1200);
  });

  it("builds a complete deal structure", () => {
    expect(
      calculateDealStructure({
        vehiclePrice: 210000,
        productTotal: 8000,
        downPayment: 30000,
        tradeInValue: 15000,
        annualRate: 4.5,
        termMonths: 60,
        balloonPayment: 0,
      }),
    ).toEqual({
      financeAmount: 173000,
      monthlyPayment: 3225.24,
      totalPayable: 193514.4,
    });
  });
});
