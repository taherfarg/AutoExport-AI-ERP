import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to AutoSphere ERP" })).toBeVisible();
});

test("new workspace can add a branch and vehicle", async ({ page }) => {
  const id = Date.now();
  const email = `phase2a-${id}@example.test`;
  const slug = `phase2a-${id}`;
  const stockNumber = `E2E-${id}`;
  const vin = `E2EVIN${id}`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Create dealership workspace")).toBeVisible();
  await page.getByLabel("Company name").fill(`Phase 2A Motors ${id}`);
  await page.getByLabel("Legal name").fill(`Phase 2A Motors ${id} LLC`);
  await page.getByLabel("Workspace slug example: pollux-motors").fill(slug);
  await page.getByRole("button", { name: "Create workspace" }).click();

  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15000 });

  await page.goto("/settings/branches");
  await page.getByLabel("Name").fill("Dubai Showroom");
  await page.getByLabel("Code").fill(`DXB-${id}`);
  await page.getByLabel("City").fill("Dubai");
  await page.getByRole("button", { name: "Add branch" }).click();
  await expect(page.getByText("Dubai Showroom")).toBeVisible();

  await page.goto("/vehicles");
  await page.locator("#stockNumber").fill(stockNumber);
  await page.locator("#vin").fill(vin);
  await page.locator("#vehicleBrand").fill("Toyota");
  await page.locator("#model").fill("Hilux");
  await page.locator("#year").fill("2026");
  await page.locator("#trim").fill("GR Sport");
  await page.locator("#purchasePrice").fill("100000");
  await page.locator("#shippingCost").fill("7000");
  await page.locator("#customsCost").fill("12000");
  await page.locator("#preparationCost").fill("2500");
  await page.locator("#sellingPrice").fill("150000");
  await page.getByRole("button", { name: "Create vehicle" }).click();

  await expect(page.getByRole("heading", { name: "2026 Toyota Hilux" })).toBeVisible();
  await expect(page.getByText(stockNumber)).toBeVisible();
  await expect(page.getByText("Total landed cost")).toBeVisible();
});
