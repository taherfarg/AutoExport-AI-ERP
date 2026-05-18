import { describe, expect, it } from "vitest";
import { filterModulesByPackage } from "@/lib/modules/module-registry";

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
