import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function getEnvValue(key: string) {
  if (process.env[key]) {
    return process.env[key]!;
  }

  if (!existsSync(".env.local")) {
    return "";
  }

  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line?.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") ?? "";
}

test.describe.configure({ timeout: 180_000 });

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to AutoSphere ERP" })).toBeVisible();
});

test("health endpoint returns safe readiness payload", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.supabaseUrlConfigured).toBe(true);
  expect(body.serviceRoleConfigured).toBe(true);
  expect(JSON.stringify(body)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  expect(JSON.stringify(body)).not.toContain("OPENAI_API_KEY");
});

test("protected app routes redirect unauthenticated visitors", async ({ page }) => {
  const protectedRoutes = [
    "/dashboard",
    "/vehicles",
    "/crm/leads",
    "/sales/quotations",
    "/sales/deals",
    "/documents",
    "/finance/accounting",
    "/service/workshop",
    "/parts/inventory",
    "/ai",
    "/reports",
    "/operations/alerts",
    "/chat",
    "/settings/audit-logs",
  ];

  for (const route of protectedRoutes) {
    await page.goto(route);
    await page.waitForURL("**/login", { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Sign in to AutoSphere ERP" })).toBeVisible();
  }
});

test("new workspace can add a branch, vehicle, and lead", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  page.on("pageerror", (err) => console.error("BROWSER PAGE ERROR:", err.message));

  const id = Date.now();
  const email = `phase2a-${id}@gmail.com`;
  const password = "Password123!";
  const slug = `phase2a-${id}`;
  const stockNumber = `E2E-${id}`;
  const vin = `E2EVIN${id}`;
  const leadName = `Gulf Fleet Lead ${id}`;
  const followUpTitle = `Follow up buyer ${id}`;
  const messageBody = `Customer asked for export-ready Hilux stock ${id}.`;
  const documentTitle = `Central archive title ${id}`;
  const signatureTitle = `Reservation signature ${id}`;
  const marketingListingTitle = `Marketing listing ${id}`;
  const campaignName = `Hilux campaign ${id}`;
  const calendarTitle = `Publish spotlight ${id}`;
  const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );

  const supabaseAdmin = createClient(
    getEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvValue("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(adminCreateError).toBeNull();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Create dealership workspace")).toBeVisible();
  await page.getByLabel("Company name").fill(`Phase 2A Motors ${id}`);
  await page.getByLabel("Legal name").fill(`Phase 2A Motors ${id} LLC`);
  await page.getByLabel("Workspace slug example: pollux-motors").fill(slug);
  await page.getByRole("button", { name: "Create workspace" }).click();

  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible({ timeout: 15000 });

  await page.goto("/settings/branches");
  await page.getByLabel("Name").fill("Dubai Showroom");
  await page.getByLabel("Code").fill(`DXB-${id}`);
  await page.getByLabel("City").fill("Dubai");
  await page.getByRole("button", { name: "Add branch" }).click();
  await expect(page.getByText("Dubai Showroom")).toBeVisible();

  await page.getByLabel("Name").fill("Parts Warehouse");
  await page.getByLabel("Code").fill(`PWH-${id}`);
  await page.getByLabel("City").fill("Dubai");
  await page.getByRole("button", { name: "Add branch" }).click();
  await expect(page.getByText("Parts Warehouse")).toBeVisible();

  await page.goto("/vehicles?create=1#add-vehicle");
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
  await page.getByLabel("Export available").check();
  await page.getByRole("button", { name: "Create vehicle" }).click();

  await expect(page.getByRole("heading", { name: "2026 Toyota Hilux" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(stockNumber)).toBeVisible();
  await expect(page.getByText("Total landed cost")).toBeVisible();
  await expect(page.getByText("0 of 3 required documents complete")).toBeVisible();

  await page.getByRole("button", { name: "Save document" }).click();
  await expect(page.getByText("Vehicle document saved.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText("1 of 3 required documents complete")).toBeVisible();

  await page.locator("#decodedBrand").fill("Toyota");
  await page.locator("#decodedModel").fill("Hilux");
  await page.locator("#decodedYear").fill("2026");
  await page.getByRole("button", { name: "Save VIN decode" }).click();
  await expect(page.getByText("VIN intelligence saved.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText("VIN decoded", { exact: true })).toBeVisible();

  await page.locator("#marketAverage").fill("145000");
  await page.locator("#recommendedPrice").fill("146000");
  await page.getByRole("button", { name: "Save valuation" }).click();
  await expect(page.getByText("Market valuation saved.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText("Recommended market price AED 146,000")).toBeVisible();

  await page.locator("#sourceName").fill(`Dubizzle ${id}`);
  await page.locator("#competitorPrice").fill("144000");
  await page.getByRole("button", { name: "Save competitor price" }).click();
  await expect(page.getByText("Competitor price saved.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Dubizzle ${id}`)).toBeVisible();

  await page.locator("#historyRiskSummary").selectOption("low");
  await page.getByRole("button", { name: "Save history report" }).click();
  await expect(page.getByText("Vehicle history report saved.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText("History risk: low")).toBeVisible();

  await page.goto("/vehicles/pricing");
  await expect(page.getByText("Market intelligence").first()).toBeVisible();
  await expect(page.getByText("AED 146,000").first()).toBeVisible();

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

  // --- CRM Communications Phase 14 E2E Test Blocks ---
  const leadPageUrl = page.url();

  // Test Consent Manager E2E - Grant consent for SMS (index 2)
  await page.locator('button:has-text("Grant Consent")').nth(2).click();
  await expect(page.getByText("Consent updated for SMS.")).toBeVisible();

  // Navigate to communications settings page
  await page.goto("/settings/communication");
  await expect(page.getByRole("heading", { name: "Communications Channel Manager" })).toBeVisible();

  // Configure SMS provider settings
  await page.locator("#twilioAccountSid").fill("TEST_ACCOUNT_ID_PLACEHOLDER");
  await page.locator("#twilioAuthToken").fill("TEST_AUTH_TOKEN_PLACEHOLDER");
  await page.locator("#twilioPhoneNumber").fill("+1234567890");
  await page.locator("#sms-provider-form").getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("SMS settings saved successfully.")).toBeVisible();

  // Create message template
  await page.getByRole("button", { name: "Add Template" }).click();
  await page.locator("#name").fill("E2E Test Template");
  await page.locator("#channel").selectOption("sms");
  await page.locator("#body").fill("Hello {{customer_name}}, check out our new arrivals!");
  await page.getByRole("button", { name: "Save Template" }).click();
  await expect(page.getByText("Template saved successfully.")).toBeVisible();

  // Return to lead profile page
  await page.goto(leadPageUrl);

  // Draft and dispatch message using template
  await page.getByRole("button", { name: "Create Outreach" }).click();
  await page.locator("#templateSelect").selectOption({ label: "E2E Test Template (sms)" });
  await page.locator("#var-customer_name").fill(leadName);
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText("Outbound message draft saved successfully.")).toBeVisible();

  // Expand the draft card and approve/send
  await page.getByRole("button", { name: "Toggle details" }).first().click();
  await page.getByRole("button", { name: "Approve & Dispatch" }).click();
  await expect(page.getByText("Message dispatched and acknowledged.")).toBeVisible();
  // --- End Communications E2E ---

  await page.goto("/sales/quotations");
  await expect(page.getByRole("heading", { name: "Sales Quotations" })).toBeVisible();
  await page.locator("#notes").fill(`Quotation for ${leadName}`);
  await page.getByRole("button", { name: "Create quotation" }).click();

  await expect(page.getByText("Quotation preview")).toBeVisible();
  await expect(page.getByText(leadName, { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Create reservation" }).click();
  await expect(page.getByText("deposit")).toBeVisible();

  await page.getByRole("button", { name: "Create invoice" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();

  await page.getByRole("button", { name: "Record payment" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(/^PAY-/)).toBeVisible();

  await page.goto("/sales/invoices");
  await expect(page.getByRole("heading", { name: "Sales Invoices" })).toBeVisible();
  await expect(page.getByText("Paid amount", { exact: true })).toBeVisible();

  await page.goto("/sales/deals");
  await expect(page.getByRole("heading", { name: "F&I Deal Desk" })).toBeVisible();
  await page.locator("#productTotal").fill("8000");
  await page.locator("#downPayment").fill("30000");
  await page.locator("#annualInterestRate").fill("4.5");
  await page.getByRole("button", { name: "Create deal" }).click();
  await expect(page.getByText("Deal structure saved.")).toBeVisible();

  await page.locator("#name").fill(`GCC Auto Finance ${id}`);
  await page.locator("#baseRate").fill("4.25");
  await page.getByRole("button", { name: "Save lender" }).click();
  await expect(page.getByText("Lender saved.")).toBeVisible();

  await page.getByRole("button", { name: "Add deal product" }).click();
  await expect(page.getByText("Deal product added.")).toBeVisible();

  await page.getByRole("button", { name: "Submit finance application" }).click();
  await expect(page.getByText("Finance application submitted.")).toBeVisible();

  await page.getByRole("button", { name: "Send lender submission" }).click();
  await expect(page.getByText("Lender submission sent.")).toBeVisible();

  await page.getByRole("button", { name: "Request approval" }).click();
  await expect(page.getByText("Approval requested.")).toBeVisible();

  await page.getByRole("button", { name: "Approve pending deal" }).click();
  await expect(page.getByText("Deal approved.")).toBeVisible();

  await page.goto("/finance");
  await expect(page.getByRole("heading", { name: "Finance Lite" })).toBeVisible();
  await page.locator("#description").fill(`Preparation expense ${id}`);
  await page.locator("#amount").fill("2500");
  await page.locator("#supplierName").fill(`Detailing Supplier ${id}`);
  await page.getByRole("button", { name: "Record expense" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Preparation expense ${id}`)).toBeVisible();

  await page.locator("#payableSupplierName").fill(`Repair Supplier ${id}`);
  await page.locator("#payableDescription").fill(`Repair payable ${id}`);
  await page.locator("#payableAmount").fill("5000");
  await page.getByRole("button", { name: "Create payable" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Repair Supplier ${id}`)).toBeVisible();

  await page.locator("#commissionRate").fill("2.5");
  await page.getByRole("button", { name: "Create commission" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(/^COM-/)).toBeVisible();

  await page.goto("/finance/accounting");
  await expect(page.getByRole("heading", { name: "Full Accounting" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Vehicle Inventory/ }).first()).toBeVisible();

  await page.locator("#memo").fill(`Opening inventory accounting entry ${id}`);
  await page.locator("#journalAmount").fill("25000");
  await page.getByRole("button", { name: "Create journal entry" }).click();
  await expect(page.getByText("Journal entry created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Opening inventory accounting entry ${id}`)).toBeVisible();

  await page.getByRole("button", { name: "Post journal entry" }).first().click();
  await expect(page.getByText("Journal entry posted.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText("Posted").first()).toBeVisible();

  await page.locator("#accountCode").fill(`61${String(id).slice(-3)}`);
  await page.locator("#accountName").fill(`Workshop Supplies Expense ${id}`);
  await page.getByRole("button", { name: "Create GL account" }).click();
  await expect(page.getByText("GL account created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByRole("cell", { name: `Workshop Supplies Expense ${id}` })).toBeVisible();

  await page.locator("#taxName").fill(`Reduced VAT ${id}`);
  await page.getByRole("button", { name: "Create tax rate" }).click();
  await expect(page.getByText("Tax rate created.")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Create tax report" }).click();
  await expect(page.getByText("Tax report created.")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Create bank transaction" }).click();
  await expect(page.getByText("Bank transaction created.")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Create bank reconciliation" }).click();
  await expect(page.getByText("Bank reconciliation created.")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Queue accounting export" }).click();
  await expect(page.getByText("Accounting export queued.")).toBeVisible({ timeout: 15000 });

  await page.goto("/service/workshop");
  await expect(page.getByRole("heading", { name: "Service Workshop" })).toBeVisible();

  await page.locator("#displayName").fill(`Senior Technician ${id}`);
  await page.getByRole("button", { name: "Create technician" }).click();
  await expect(page.getByText("Technician created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Senior Technician ${id}`).first()).toBeVisible();

  await page.locator("#appointmentTitle").fill(`Service appointment ${id}`);
  await page.getByRole("button", { name: "Create appointment" }).click();
  await expect(page.getByText("Service appointment created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Service appointment ${id}`).first()).toBeVisible();

  await page.locator("#serviceTitle").fill(`Brake service order ${id}`);
  await page.locator("#complaint").fill(`Brake vibration complaint ${id}`);
  await page.getByRole("button", { name: "Create service order" }).click();
  await expect(page.getByText("Service order created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Brake service order ${id}`).first()).toBeVisible();

  await page.locator("#jobTitle").fill(`Brake diagnosis job ${id}`);
  await page.getByRole("button", { name: "Create service job" }).click();
  await expect(page.getByText("Service job created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Brake diagnosis job ${id}`).first()).toBeVisible();

  await page.locator("#laborDescription").fill(`Initial brake diagnosis labor ${id}`);
  await page.getByRole("button", { name: "Create labor line" }).click();
  await expect(page.getByText("Labor line created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Initial brake diagnosis labor ${id}`).first()).toBeVisible();

  await page.getByRole("button", { name: "Create inspection result" }).click();
  await expect(page.getByText("Inspection result created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(/^INSP-/)).toBeVisible();

  await page.locator("#providerName").fill(`Factory Warranty ${id}`);
  await page.getByRole("button", { name: "Create warranty claim" }).click();
  await expect(page.getByText("Warranty claim created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Factory Warranty ${id}`).first()).toBeVisible();

  await page.goto("/parts/inventory");
  await expect(page.getByRole("heading", { name: "Parts Inventory" })).toBeVisible();

  const partNumber = `FILTER-${id}`;
  await page.getByLabel("Part number").fill(partNumber);
  await page.getByLabel("Part name").fill(`LX oil filter ${id}`);
  await page.getByRole("button", { name: "Create part" }).click();
  await expect(page.getByText("Part created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(partNumber).first()).toBeVisible();

  await page.getByLabel("Supplier name").fill(`Parts Supplier ${id}`);
  await page.getByRole("button", { name: "Create supplier" }).click();
  await expect(page.getByText("Parts supplier created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Parts Supplier ${id}`).first()).toBeVisible();

  await page.getByRole("button", { name: "Create purchase order" }).click();
  await expect(page.getByText("Parts purchase order created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.locator("p").filter({ hasText: /^PPO-/ }).first()).toBeVisible();

  await page.getByLabel("Quantity ordered").fill("5");
  await page.getByRole("button", { name: "Add PO item" }).click();
  await expect(page.getByText("Purchase order item created.")).toBeVisible({ timeout: 15000 });
  await page.reload();

  await page.getByLabel("Quantity received").fill("5");
  await page.getByRole("button", { name: "Post receipt" }).click();
  await expect(page.getByText("Parts receipt posted.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.locator("p").filter({ hasText: /^PRC-/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "Create transfer" }).click();
  await expect(page.getByText("Parts transfer created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.locator("p").filter({ hasText: /^PTR-/ }).first()).toBeVisible();

  await page.getByLabel("Service part description").fill(`Service oil filter ${id}`);
  await page.getByRole("button", { name: "Add service part" }).click();
  await expect(page.getByText("Service part line created.")).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(`Service oil filter ${id}`).first()).toBeVisible();

  await page.goto("/export/orders");
  await expect(page.getByRole("heading", { name: "Import & Export Operations" })).toBeVisible();
  await page.locator("#destinationPort").fill("Algiers");
  await page.locator("#bookingNumber").fill(`BK-${id}`);
  await page.locator("#containerNumber").fill(`CONT-${id}`);
  await page.locator("#blNumber").fill(`BL-${id}`);
  await page.getByRole("button", { name: "Create order" }).click();
  await page.waitForTimeout(1000);
  if (!/\/export\/orders\/[^/]+$/.test(new URL(page.url()).pathname)) {
    await page.reload();
    const exportOrderLink = page.locator("tr").filter({ hasText: stockNumber }).getByRole("link").first();
    const exportOrderHref = await exportOrderLink.getAttribute("href");
    expect(exportOrderHref).toMatch(/^\/export\/orders\/[^/]+$/);
    await page.goto(exportOrderHref!);
  }

  await expect(page.getByText("Export overview")).toBeVisible();
  await expect(page.getByText(`BK-${id}`)).toBeVisible();

  await page.getByRole("button", { name: "Add event" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText("Jebel Ali")).toBeVisible();

  await page.locator("#customsStatus").selectOption("submitted");
  await page.locator("#declarationNumber").fill(`DECL-${id}`);
  await page.getByRole("button", { name: "Save customs" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`DECL-${id}`)).toBeVisible();

  await page.locator('select[name="status"]').first().selectOption("verified");
  await page.getByRole("button", { name: "Save" }).first().click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText("1/9 required docs ready")).toBeVisible();

  await page.locator("#amount").fill("8500");
  await page.locator("#supplierName").fill(`GulfLine ${id}`);
  await page.getByRole("button", { name: "Add cost" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`GulfLine ${id}`)).toBeVisible();

  await page.goto("/export/orders");
  await page.locator("#supplierName").fill(`Belgium Import ${id}`);
  await page.getByRole("button", { name: "Create import order" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Belgium Import ${id}`)).toBeVisible();

  await page.goto("/documents");
  await expect(page.getByRole("heading", { name: "Documents & Digital Signature" })).toBeVisible();
  await page.locator("#documentTitle").fill(documentTitle);
  await page.locator("#documentFile").setInputFiles({
    name: `document-${id}.pdf`,
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await page.getByRole("button", { name: "Upload document" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(documentTitle).first()).toBeVisible();

  await page.locator("#documentId").selectOption({ label: documentTitle });
  await page.locator("#verificationNotes").fill(`Verified archive document ${id}`);
  await page.getByRole("button", { name: "Verify document" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Verified archive document ${id}`)).toBeVisible();

  await page.locator("#signatureTitle").fill(signatureTitle);
  await page.locator("#sentToName").fill(`Signer ${id}`);
  await page.locator("#sentToEmail").fill(`signer-${id}@example.com`);
  await page.getByRole("button", { name: "Create signature request" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Signer ${id}`).first()).toBeVisible();

  await page.locator("#signedByName").fill(`Signer ${id}`);
  await page.locator("#signatureImage").setInputFiles({
    name: `signature-${id}.png`,
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await page.locator("#signedDocument").setInputFiles({
    name: `signed-${id}.pdf`,
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await page.getByRole("button", { name: "Mark signed" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(/^SDOC-/)).toBeVisible();

  await page.goto("/marketing/listings");
  await expect(page.getByRole("heading", { name: "Marketing & Listings" })).toBeVisible();
  await page.locator("#listingTitle").fill(marketingListingTitle);
  await page.getByRole("button", { name: "Create listing" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator("tr").filter({ hasText: marketingListingTitle })).toBeVisible();

  await page.locator("#overridePrice").fill("148500");
  await page.getByRole("button", { name: "Save price override" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText("Marketplace campaign price")).toBeVisible();

  await page.locator("#syncOperation").selectOption("publish");
  await page.getByRole("button", { name: "Queue sync job" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText("Queued").first()).toBeVisible();

  await page.locator("#syncMessage").fill(`Provider accepted listing ${id}`);
  await page.getByRole("button", { name: "Add sync log" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Provider accepted listing ${id}`)).toBeVisible();

  await page.locator("#marketplaceLeadName").fill(`Marketplace Buyer ${id}`);
  await page.locator("#marketplaceLeadPhone").fill("+971511111111");
  await page.getByRole("button", { name: "Capture marketplace lead" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Marketplace Buyer ${id}`)).toBeVisible();

  await page.locator("#caption").fill(`Instagram launch caption ${id}`);
  await page.getByRole("button", { name: "Create social draft" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Instagram launch caption ${id}`)).toBeVisible();

  await page.locator("#campaignName").fill(campaignName);
  await page.getByRole("button", { name: "Create campaign" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(campaignName)).toBeVisible();

  await page.locator("#calendarTitle").fill(calendarTitle);
  await page.getByRole("button", { name: "Add calendar item" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(calendarTitle)).toBeVisible();

  await page.locator("#sourceKey").fill(`instagram_${id}`);
  await page.locator("#sourceName").fill(`Instagram ${id}`);
  await page.locator("#monthlyLeads").fill("24");
  await page.getByRole("button", { name: "Save source metrics" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(`Instagram ${id}`)).toBeVisible();

  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: "AI Technical Intelligence" })).toBeVisible();
  await page.locator("#prompt").fill("Which Toyota cars are available?");
  await page.getByRole("button", { name: "Ask AI" }).click();
  await expect(page.getByText("Matches").first()).toBeVisible({ timeout: 30000 });

  await page.locator("#prompt").fill("Create quotation draft for this customer.");
  await page.getByRole("button", { name: "Ask AI" }).click();
  await expect(page.getByRole("button", { name: "Approve" }).first()).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Approve" }).first().click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText("Approved").first()).toBeVisible();

  await page.locator("#reportPrompt").fill(`Generate inventory report draft ${id}.`);
  await page.getByRole("button", { name: "Create report request" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(/^AIR-/)).toBeVisible();

  await page.locator("#documentId").selectOption({ label: documentTitle });
  await page.locator("#documentType").fill("vehicle_title");
  await page.getByRole("button", { name: "Queue extraction" }).click();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText(/^AIX-/)).toBeVisible();

  // Phase 20: Advanced AI Automation
  await page.goto("/ai/automation");
  await expect(page.getByRole("heading", { name: "Advanced AI Automation" })).toBeVisible();

  // 1. Toggle agent on
  await page.locator("#parts_reorder-toggle-btn").click();
  await expect(page.getByText("Successfully toggled Smart Parts Reorder Agent!")).toBeVisible({ timeout: 15000 });

  // 2. OCR Intake document trigger and simulated verify
  await page.locator("#documentType").selectOption("supplier_invoice");
  await page.locator("#documentFile").setInputFiles({
    name: `invoice-${id}.pdf`,
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await page.locator("#customOcrText").fill("INVOICE\nSUPPLIER: AutoParts Depot Ltd\nINVOICE #: INV-2026-0520\nPART NUMBER: BP-202X\nQTY: 25\nTOTAL AMOUNT DUE: AED 3,000.00");
  await page.locator("#ocrSubmitButton").click();
  await expect(page.getByText("Document parsed successfully!")).toBeVisible({ timeout: 15000 });

  // 3. Inspect parsed values
  await expect(page.locator("#ocrCommitForm")).toBeVisible();
  await expect(page.locator("#partNumber")).toHaveValue("BP-202X");

  // 4. Commit OCR extraction
  await page.locator("#ocrCommitButton").click();
  await expect(page.getByText("Extracted fields committed perfectly!")).toBeVisible({ timeout: 15000 });

  // 5. Trigger crm lead follow up agent scan to generate proposal
  await page.locator("#crm_follow_up-scan-btn").click();
  await expect(page.getByText("Autonomous scan finished!")).toBeVisible({ timeout: 15000 });

  // 6. Approve proposal in Manager Approval Feed
  await page.getByRole("button", { name: "Approve & Execute" }).first().click();
  await expect(page.getByText("Proposal resolved perfectly!")).toBeVisible({ timeout: 15000 });

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await page.locator("#reportType").selectOption("inventory");
  await page.locator("#exportFormat").selectOption("csv");
  await page.getByRole("button", { name: "Create export" }).click();
  await expect(page.getByText(/^EXP-/)).toBeVisible();

  await page.goto("/operations/alerts");
  await expect(page.getByRole("heading", { name: "Smart Alerts" })).toBeVisible();
  await page.locator("#alertTitle").fill(`Payment alert ${id}`);
  await page.getByRole("button", { name: "Create alert" }).click();
  await expect(page.getByText(`Payment alert ${id}`)).toBeVisible();

  await page.getByRole("button", { name: "Resolve alert" }).first().click();
  await expect(page.getByText("Resolved").first()).toBeVisible();

  await page.locator("#taskTitle").fill(`Alert task ${id}`);
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText(`Alert task ${id}`)).toBeVisible();

  await page.locator("#reminderTitle").fill(`Alert reminder ${id}`);
  await page.getByRole("button", { name: "Create reminder" }).click();
  await expect(page.getByText(`Alert reminder ${id}`)).toBeVisible();

  await page.goto("/chat");
  await expect(page.getByRole("heading", { name: "Chat Center" })).toBeVisible();
  await page.locator("#threadTitle").fill(`Operations thread ${id}`);
  await page.getByRole("button", { name: "Create thread" }).click();
  await expect(page.getByText(`Operations thread ${id}`)).toBeVisible();

  await page.locator("#messageBody").fill(`Operations chat message ${id}`);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(`Operations chat message ${id}`)).toBeVisible();

  await page.locator("#chatTaskTitle").fill(`Chat task ${id}`);
  await Promise.all([
    page.waitForURL("**/operations/alerts"),
    page.getByRole("button", { name: "Create chat task" }).click(),
  ]);
  await expect(page.getByText(`Chat task ${id}`)).toBeVisible();

  await page.goto("/subscriptions");
  await expect(page.getByRole("heading", { name: "Subscription & Billing" })).toBeVisible();
  await page.locator("#billingName").fill(`Billing Contact ${id}`);
  await page.locator("#billingEmail").fill(`billing-${id}@example.test`);
  await page.locator("#defaultCurrencyCode").fill("USD");
  await page.getByRole("button", { name: "Save billing customer" }).click();
  await expect(page.getByText(/billing customer saved/i)).toBeVisible();

  await page.getByRole("button", { name: "Refresh usage" }).click();
  await expect(page.getByText(/Usage counters refreshed|Usage refreshed with/i)).toBeVisible();

  await page.getByRole("button", { name: /Upgrade to Enterprise/ }).click();
  await expect(page.getByText(/checkout session created/i)).toBeVisible();

  await page.getByRole("button", { name: "Open billing portal" }).click();
  await expect(page.getByText(/billing portal session created/i)).toBeVisible();

  await page.goto("/settings/audit-logs");
  await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();
  await expect(page.getByText("Create report export").first()).toBeVisible();
});
