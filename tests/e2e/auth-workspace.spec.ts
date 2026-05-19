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
  await page.getByLabel("Export available").check();
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

  await page.goto("/sales/quotations");
  await expect(page.getByRole("heading", { name: "Sales Quotations" })).toBeVisible();
  await page.locator("#notes").fill(`Quotation for ${leadName}`);
  await page.getByRole("button", { name: "Create quotation" }).click();

  await expect(page.getByText("Quotation preview")).toBeVisible();
  await expect(page.getByText(leadName, { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Create reservation" }).click();
  await expect(page.getByText("deposit")).toBeVisible();

  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();

  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText(/^PAY-/)).toBeVisible();

  await page.goto("/sales/invoices");
  await expect(page.getByRole("heading", { name: "Sales Invoices" })).toBeVisible();
  await expect(page.getByText("Paid amount", { exact: true })).toBeVisible();

  await page.goto("/finance");
  await expect(page.getByRole("heading", { name: "Finance Lite" })).toBeVisible();
  await page.locator("#description").fill(`Preparation expense ${id}`);
  await page.locator("#amount").fill("2500");
  await page.locator("#supplierName").fill(`Detailing Supplier ${id}`);
  await page.getByRole("button", { name: "Record expense" }).click();
  await expect(page.getByText(`Preparation expense ${id}`)).toBeVisible();

  await page.locator("#payableSupplierName").fill(`Repair Supplier ${id}`);
  await page.locator("#payableDescription").fill(`Repair payable ${id}`);
  await page.locator("#payableAmount").fill("5000");
  await page.getByRole("button", { name: "Create payable" }).click();
  await expect(page.getByText(`Repair Supplier ${id}`)).toBeVisible();

  await page.locator("#commissionRate").fill("2.5");
  await page.getByRole("button", { name: "Create commission" }).click();
  await expect(page.getByText(/^COM-/)).toBeVisible();

  await page.goto("/export/orders");
  await expect(page.getByRole("heading", { name: "Import & Export Operations" })).toBeVisible();
  await page.locator("#destinationPort").fill("Algiers");
  await page.locator("#bookingNumber").fill(`BK-${id}`);
  await page.locator("#containerNumber").fill(`CONT-${id}`);
  await page.locator("#blNumber").fill(`BL-${id}`);
  await page.getByRole("button", { name: "Create order" }).click();

  await expect(page.getByText("Export overview")).toBeVisible();
  await expect(page.getByText(`BK-${id}`)).toBeVisible();

  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText("Booked").first()).toBeVisible();

  await page.locator("#customsStatus").selectOption("submitted");
  await page.locator("#declarationNumber").fill(`DECL-${id}`);
  await page.getByRole("button", { name: "Save customs" }).click();
  await expect(page.getByText(`DECL-${id}`)).toBeVisible();

  await page.locator('select[name="status"]').first().selectOption("verified");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("1/9 required docs ready")).toBeVisible();

  await page.locator("#amount").fill("8500");
  await page.locator("#supplierName").fill(`GulfLine ${id}`);
  await page.getByRole("button", { name: "Add cost" }).click();
  await expect(page.getByText(`GulfLine ${id}`)).toBeVisible();

  await page.goto("/export/orders");
  await page.locator("#supplierName").fill(`Belgium Import ${id}`);
  await page.getByRole("button", { name: "Create import order" }).click();
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
  await expect(page.getByText(documentTitle).first()).toBeVisible();

  await page.locator("#documentId").selectOption({ label: documentTitle });
  await page.locator("#verificationNotes").fill(`Verified archive document ${id}`);
  await page.getByRole("button", { name: "Verify document" }).click();
  await expect(page.getByText(`Verified archive document ${id}`)).toBeVisible();

  await page.locator("#signatureTitle").fill(signatureTitle);
  await page.locator("#sentToName").fill(`Signer ${id}`);
  await page.locator("#sentToEmail").fill(`signer-${id}@example.test`);
  await page.getByRole("button", { name: "Create signature request" }).click();
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
  await expect(page.getByText(/^SDOC-/)).toBeVisible();

  await page.goto("/marketing/listings");
  await expect(page.getByRole("heading", { name: "Marketing & Listings" })).toBeVisible();
  await page.locator("#listingTitle").fill(marketingListingTitle);
  await page.getByRole("button", { name: "Create listing" }).click();
  await expect(page.getByText(marketingListingTitle)).toBeVisible();

  await page.locator("#caption").fill(`Instagram launch caption ${id}`);
  await page.getByRole("button", { name: "Create social draft" }).click();
  await expect(page.getByText(`Instagram launch caption ${id}`)).toBeVisible();

  await page.locator("#campaignName").fill(campaignName);
  await page.getByRole("button", { name: "Create campaign" }).click();
  await expect(page.getByText(campaignName)).toBeVisible();

  await page.locator("#calendarTitle").fill(calendarTitle);
  await page.getByRole("button", { name: "Add calendar item" }).click();
  await expect(page.getByText(calendarTitle)).toBeVisible();

  await page.locator("#sourceKey").fill(`instagram_${id}`);
  await page.locator("#sourceName").fill(`Instagram ${id}`);
  await page.locator("#monthlyLeads").fill("24");
  await page.getByRole("button", { name: "Save source metrics" }).click();
  await expect(page.getByText(`Instagram ${id}`)).toBeVisible();
});
