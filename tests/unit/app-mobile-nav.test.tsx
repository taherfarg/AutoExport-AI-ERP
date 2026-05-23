import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppMobileNav } from "@/components/app-shell/app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/service/workshop",
}));

const enabledModules = [
  "dashboard",
  "vehicles",
  "global_stock",
  "crm",
  "sales",
  "export",
  "documents",
  "finance",
  "service",
  "parts",
  "marketing",
  "ai",
  "reports",
  "alerts",
  "chat",
  "settings",
];

describe("AppMobileNav", () => {
  it("keeps secondary modules reachable from a mobile more menu", () => {
    render(<AppMobileNav enabledModuleKeys={enabledModules} />);

    const openButton = screen.getByRole("button", { name: /open module menu/i });
    expect(openButton).toBeTruthy();
    expect(screen.queryByRole("link", { name: /service workshop/i })).toBeNull();

    fireEvent.click(openButton);

    expect(screen.getByRole("dialog", { name: /all modules/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /service workshop/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /parts inventory/i })).toBeTruthy();
    expect(screen.getByText("Active section")).toBeTruthy();
  });
});

