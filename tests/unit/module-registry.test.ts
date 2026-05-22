import { describe, expect, it } from "vitest";
import { filterModulesByPackage } from "@/lib/modules/module-registry";
import { getModuleAccessForPath } from "@/lib/modules/entitlements";

describe("filterModulesByPackage", () => {
  it("returns only package-enabled modules plus branch settings", () => {
    const modules = filterModulesByPackage(["dashboard", "vehicles", "settings"]);
    const moduleKeys = modules.map((module) => module.key);

    expect(moduleKeys).toContain("dashboard");
    expect(moduleKeys).toContain("vehicles");
    expect(moduleKeys).toContain("branches");
    expect(moduleKeys).not.toContain("export");
  });
});

describe("getModuleAccessForPath", () => {
  it("locks direct routes for modules outside the active package", () => {
    const access = getModuleAccessForPath("/finance/accounting", ["dashboard", "vehicles", "crm", "reports", "settings"]);

    expect(access).toMatchObject({
      allowed: false,
      moduleKey: "accounting",
      gateKey: "finance",
      label: "Accounting",
      href: "/finance/accounting",
    });
  });

  it("allows nested routes when their package gate is enabled", () => {
    const access = getModuleAccessForPath("/finance/accounting/reports", ["dashboard", "finance", "settings"]);

    expect(access).toMatchObject({
      allowed: true,
      moduleKey: "accounting",
      gateKey: "finance",
    });
  });

  it("allows company settings and branch setup even when the package is minimal", () => {
    expect(getModuleAccessForPath("/settings/company", ["dashboard"])).toMatchObject({
      allowed: true,
      moduleKey: "settings",
    });
    expect(getModuleAccessForPath("/settings/branches", ["dashboard"])).toMatchObject({
      allowed: true,
      moduleKey: "branches",
    });
  });
});
