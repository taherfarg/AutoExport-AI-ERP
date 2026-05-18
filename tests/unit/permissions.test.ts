import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("PERMISSIONS", () => {
  it("contains phase 1 management permissions", () => {
    expect(PERMISSIONS.MANAGE_USERS).toBe("manage_users");
    expect(PERMISSIONS.MANAGE_SUBSCRIPTIONS).toBe("manage_subscriptions");
    expect(PERMISSIONS.MANAGE_COMPANY_SETTINGS).toBe("manage_company_settings");
  });
});
