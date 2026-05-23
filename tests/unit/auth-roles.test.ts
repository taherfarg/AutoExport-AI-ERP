import { describe, expect, it } from "vitest";
import {
  BUSINESS_ROLE_OPTIONS,
  DEFAULT_COMPANY_ROLE_TEMPLATES,
  getBusinessRoleOption,
  isBusinessRoleKey,
} from "@/lib/auth/business-roles";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("business role onboarding", () => {
  it("offers dealership-specific signup role categories", () => {
    expect(BUSINESS_ROLE_OPTIONS.map((role) => role.key)).toEqual([
      "company_owner",
      "general_manager",
      "sales_manager",
      "salesperson",
      "accountant",
      "inventory_manager",
      "export_manager",
      "marketing_manager",
      "document_controller",
      "service_manager",
      "parts_manager",
      "auditor",
      "other",
    ]);
  });

  it("normalizes unknown profile role metadata to other", () => {
    expect(isBusinessRoleKey("accountant")).toBe(true);
    expect(isBusinessRoleKey("unknown")).toBe(false);
    expect(getBusinessRoleOption("unknown").key).toBe("other");
  });

  it("creates practical default workspace roles with permission sets", () => {
    const accountant = DEFAULT_COMPANY_ROLE_TEMPLATES.find((role) => role.roleKey === "accountant");
    const salesperson = DEFAULT_COMPANY_ROLE_TEMPLATES.find((role) => role.roleKey === "salesperson");

    expect(accountant?.permissionKeys).toEqual(
      expect.arrayContaining([
        PERMISSIONS.VIEW_FINANCE,
        PERMISSIONS.MANAGE_FINANCE,
        PERMISSIONS.RECORD_PAYMENT,
        PERMISSIONS.VIEW_ACCOUNTING,
        PERMISSIONS.MANAGE_ACCOUNTING,
        PERMISSIONS.MANAGE_SUPPLIERS,
      ]),
    );
    expect(salesperson?.permissionKeys).toEqual(
      expect.arrayContaining([
        PERMISSIONS.VIEW_VEHICLES,
        PERMISSIONS.VIEW_LEADS,
        PERMISSIONS.CREATE_FOLLOW_UP,
        PERMISSIONS.CREATE_QUOTATION,
      ]),
    );
    expect(salesperson?.permissionKeys).not.toContain(PERMISSIONS.VIEW_VEHICLE_PROFIT);
  });

  it("uses only known permission keys in default role templates", () => {
    const knownPermissions = new Set(Object.values(PERMISSIONS));

    for (const role of DEFAULT_COMPANY_ROLE_TEMPLATES) {
      for (const permissionKey of role.permissionKeys) {
        expect(knownPermissions.has(permissionKey)).toBe(true);
      }
    }
  });
});
