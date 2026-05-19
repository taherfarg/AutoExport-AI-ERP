import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to AutoSphere ERP" })).toBeVisible();
});

test("new workspace can add a branch, vehicle, and lead", async ({ page }) => {
  const id = Date.now();
  const email = `phase2a-${id}@example.test`;
  const slug = `phase2a-${id}`;
  const stockNumber = `E2E-${id}`;
  const vin = `E2EVIN${id}`;
  const leadName = `Gulf Fleet Lead ${id}`;
  const followUpTitle = `Follow up buyer ${id}`;
  const messageBody = `Customer asked for export-ready Hilux stock ${id}.`;

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
  await expect(page.getByText("0 of 3 required documents complete")).toBeVisible();

  await page.getByRole("button", { name: "Save document" }).click();
  await expect(page.getByText("1 of 3 required documents complete")).toBeVisible();

  await page.goto("/crm/leads");
  await expect(page.getByRole("heading", { name: "Sales CRM" })).toBeVisible();
  await page.locator("#leadName").fill(leadName);
  await page.locator("#phone").fill("+971500000000");
  await page.locator("#preferredBrand").fill("Toyota");
  await page.locator("#preferredModel").fill("Hilux");
  await page.locator("#budget").fill("175000");
  await page.getByRole("button", { name: "Create lead" }).click();

  await expect(page.getByRole("heading", { name: leadName })).toBeVisible();
  await expect(page.getByText("Toyota", { exact: true }).first()).toBeVisible();

  await page.locator("#title").fill(followUpTitle);
  await page.getByRole("button", { name: "Create follow-up" }).click();
  await expect(page.getByText(followUpTitle)).toBeVisible();

  await page.locator("#subject").fill("Vehicle inquiry");
  await page.locator("#body").fill(messageBody);
  await page.getByRole("button", { name: "Log message" }).click();
  await expect(page.getByText(messageBody)).toBeVisible();
});
