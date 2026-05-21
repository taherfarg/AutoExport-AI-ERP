/**
 * Robust regex-based OCR heuristics and proposal compilation helpers for AutoSphere ERP Phase 20.
 */

export interface ParsedVehicleTitle {
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
}

export interface ParsedSupplierInvoice {
  supplierName: string | null;
  invoiceNumber: string | null;
  amount: number | null;
  partNumber: string | null;
  partName: string | null;
  quantity: number | null;
}

type VehicleTitleCommitInput = Record<string, unknown>;

type VehicleTitleCommitPayload = {
  stockNumber: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  trim?: string;
  condition: "new" | "used" | "certified_pre_owned";
  mileage: number;
  exteriorColor?: string;
  interiorColor?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  bodyType?: string;
  seats?: number;
  doors?: number;
  originCountryCode: string;
  currentCountryCode: string;
  currentLocation?: string;
  purchasePrice: number;
  shippingCost: number;
  customsCost: number;
  preparationCost: number;
  marketingCost: number;
  otherExpenses: number;
  totalLandedCost: number;
  sellingPrice: number;
  expectedProfit: number;
  profitMargin: number;
  currencyCode: string;
  status: "available" | "reserved" | "sold" | "in_transit" | "under_customs_clearance" | "under_preparation" | "ready_for_export" | "delivered" | "cancelled";
  exportAvailable: boolean;
};

type VehicleTitleCommitValidationResult =
  | { success: true; data: VehicleTitleCommitPayload }
  | { success: false; error: string };

const vehicleStatuses = new Set([
  "available",
  "reserved",
  "sold",
  "in_transit",
  "under_customs_clearance",
  "under_preparation",
  "ready_for_export",
  "delivered",
  "cancelled",
]);

const vehicleConditions = new Set(["new", "used", "certified_pre_owned"]);

function textValue(source: VehicleTitleCommitInput, key: string, fallback = "") {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function optionalTextValue(source: VehicleTitleCommitInput, key: string) {
  const value = textValue(source, key);
  return value.length > 0 ? value : undefined;
}

function numberFrom(source: VehicleTitleCommitInput, key: string, fallback = 0) {
  const value = source[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalPositiveInteger(source: VehicleTitleCommitInput, key: string) {
  const value = source[key];
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function roundedMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function requireText(source: VehicleTitleCommitInput, key: string, label: string, fallback = "") {
  const value = textValue(source, key, fallback);
  return value.length > 0 ? value : `${label} is required before committing OCR vehicle intake.`;
}

function requirePositiveMoney(source: VehicleTitleCommitInput, key: string, label: string) {
  const value = numberFrom(source, key);
  return value > 0 ? value : `${label} must be greater than 0 before committing OCR vehicle intake.`;
}

export function validateVehicleTitleCommitInput(
  formValues: VehicleTitleCommitInput,
  extractedData: VehicleTitleCommitInput,
): VehicleTitleCommitValidationResult {
  const source = { ...extractedData, ...formValues };
  const stockNumber = requireText(source, "stockNumber", "Stock number");
  if (typeof stockNumber !== "string" || stockNumber.includes(" is required ")) {
    return { success: false, error: stockNumber };
  }

  const vin = requireText(source, "vin", "VIN");
  if (typeof vin !== "string" || vin.includes(" is required ")) {
    return { success: false, error: vin };
  }

  const brand = requireText(source, "make", "Make / brand", textValue(source, "brand"));
  if (typeof brand !== "string" || brand.includes(" is required ")) {
    return { success: false, error: brand };
  }

  const model = requireText(source, "model", "Model");
  if (typeof model !== "string" || model.includes(" is required ")) {
    return { success: false, error: model };
  }

  const year = numberFrom(source, "year");
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { success: false, error: "Year must be valid before committing OCR vehicle intake." };
  }

  const purchasePrice = requirePositiveMoney(source, "purchasePrice", "Purchase price");
  if (typeof purchasePrice !== "number") {
    return { success: false, error: purchasePrice };
  }

  const sellingPrice = requirePositiveMoney(source, "sellingPrice", "Selling price");
  if (typeof sellingPrice !== "number") {
    return { success: false, error: sellingPrice };
  }

  const condition = textValue(source, "condition", "new") as VehicleTitleCommitPayload["condition"];
  if (!vehicleConditions.has(condition)) {
    return { success: false, error: "Condition must be selected before committing OCR vehicle intake." };
  }

  const status = textValue(source, "status", "available") as VehicleTitleCommitPayload["status"];
  if (!vehicleStatuses.has(status)) {
    return { success: false, error: "Vehicle status must be selected before committing OCR vehicle intake." };
  }

  const mileage = numberFrom(source, "mileage");
  if (!Number.isInteger(mileage) || mileage < 0) {
    return { success: false, error: "Mileage must be 0 or higher before committing OCR vehicle intake." };
  }

  const originCountryCode = textValue(source, "originCountryCode", "AE").toUpperCase();
  const currentCountryCode = textValue(source, "currentCountryCode", "AE").toUpperCase();
  const currencyCode = textValue(source, "currencyCode", "AED").toUpperCase();
  if (originCountryCode.length !== 2 || currentCountryCode.length !== 2 || currencyCode.length !== 3) {
    return { success: false, error: "Country and currency codes must be valid before committing OCR vehicle intake." };
  }

  const shippingCost = numberFrom(source, "shippingCost");
  const customsCost = numberFrom(source, "customsCost");
  const preparationCost = numberFrom(source, "preparationCost");
  const marketingCost = numberFrom(source, "marketingCost");
  const otherExpenses = numberFrom(source, "otherExpenses");
  const nonNegativeCosts = [shippingCost, customsCost, preparationCost, marketingCost, otherExpenses];
  if (nonNegativeCosts.some((value) => value < 0)) {
    return { success: false, error: "Cost values cannot be negative before committing OCR vehicle intake." };
  }

  const totalLandedCost = roundedMoney(purchasePrice + shippingCost + customsCost + preparationCost + marketingCost + otherExpenses);
  const expectedProfit = roundedMoney(sellingPrice - totalLandedCost);
  const profitMargin = sellingPrice <= 0 ? 0 : roundedMoney((expectedProfit / sellingPrice) * 100);

  return {
    success: true,
    data: {
      stockNumber,
      vin,
      brand,
      model,
      year,
      trim: optionalTextValue(source, "trim"),
      condition,
      mileage,
      exteriorColor: optionalTextValue(source, "color") ?? optionalTextValue(source, "exteriorColor"),
      interiorColor: optionalTextValue(source, "interiorColor"),
      engine: optionalTextValue(source, "engine"),
      transmission: optionalTextValue(source, "transmission"),
      drivetrain: optionalTextValue(source, "drivetrain"),
      fuelType: optionalTextValue(source, "fuelType"),
      bodyType: optionalTextValue(source, "bodyType"),
      seats: optionalPositiveInteger(source, "seats"),
      doors: optionalPositiveInteger(source, "doors"),
      originCountryCode,
      currentCountryCode,
      currentLocation: optionalTextValue(source, "currentLocation"),
      purchasePrice,
      shippingCost,
      customsCost,
      preparationCost,
      marketingCost,
      otherExpenses,
      totalLandedCost,
      sellingPrice,
      expectedProfit,
      profitMargin,
      currencyCode,
      status,
      exportAvailable: source.exportAvailable === "on" || source.exportAvailable === true,
    },
  };
}

/**
 * Extracts key fields from raw OCR text using regex heuristics.
 */
export function parseOcrFields(docType: string, contentText: string): Record<string, unknown> {
  const text = contentText || "";
  
  if (docType === "vehicle_title") {
    // 1. VIN (17 alphanumeric characters, excluding I, O, Q)
    const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
    const vin = vinMatch ? vinMatch[1].toUpperCase() : null;

    // 2. Year (4 digits, starting with 19 or 20)
    const yearMatch = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

    // 3. Make / Brand
    const brands = ["Toyota", "BMW", "Mercedes", "Ford", "Honda", "Nissan", "Chevrolet", "Hyundai", "Audi", "Lexus", "Porsche"];
    let make: string | null = null;
    for (const brand of brands) {
      if (new RegExp("\\b" + brand + "\\b", "i").test(text)) {
        make = brand;
        break;
      }
    }

    // 4. Model (heuristics: e.g., Model: Corolla, or words following Make)
    let model: string | null = null;
    const modelMatch = text.match(/(?:model|series)\s*:\s*([^\n\r]+)/i);
    if (modelMatch) {
      model = modelMatch[1].trim();
    } else if (make) {
      const postMakeMatch = text.match(new RegExp(make + "\\s+([^\n\r]+)", "i"));
      if (postMakeMatch && postMakeMatch[1].toLowerCase() !== "title") {
        model = postMakeMatch[1].trim();
      }
    }

    // 5. Color
    const colors = ["Red", "Black", "White", "Silver", "Gray", "Blue", "Green", "Yellow", "Gold", "Brown"];
    let color: string | null = null;
    const colorMatch = text.match(/(?:color|colour)\s*:\s*([a-z]+)/i);
    if (colorMatch) {
      const rawColor = colorMatch[1].trim();
      color = rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase();
    } else {
      for (const col of colors) {
        if (new RegExp("\\b" + col + "\\b", "i").test(text)) {
          color = col;
          break;
        }
      }
    }

    return { vin, make, model, year, color };
  }

  if (docType === "supplier_invoice") {
    // 1. Supplier Name (e.g. "Supplier: AutoParts Ltd")
    let supplierName: string | null = null;
    const supplierMatch = text.match(/(?:supplier|seller|vendor|company)\s*:\s*([^\n\r]+)/i);
    if (supplierMatch) {
      supplierName = supplierMatch[1].trim();
    }

    // 2. Invoice Number
    let invoiceNumber: string | null = null;
    const invMatch = text.match(/(?:invoice|inv)\s*(?:no|number|#)?\s*:\s*([a-z0-9\-#]+)/i);
    if (invMatch) {
      invoiceNumber = invMatch[1].trim();
    }

    // 3. Amount (Price / Total)
    let amount: number | null = null;
    const amountMatch = text.match(/(?:total|amount|price|sum)\s*(?:due)?\s*:\s*(?:\$|aed)?\s*([\d,]+\.?\d*)/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    // 4. Part Number / SKU
    let partNumber: string | null = null;
    const partNumMatch = text.match(/(?:part|sku|item)\s*(?:no|number|#)?\s*:\s*([a-z0-9\-#]+)/i);
    if (partNumMatch) {
      partNumber = partNumMatch[1].trim();
    }

    // 5. Part Name
    let partName: string | null = null;
    const partNameMatch = text.match(/(?:part_name|description|item_name)\s*:\s*([^\n\r]+)/i);
    if (partNameMatch) {
      partName = partNameMatch[1].trim();
    }

    // 6. Quantity
    let quantity: number | null = null;
    const qtyMatch = text.match(/(?:qty|quantity|count)\s*:\s*(\d+)/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
    }

    return { supplierName, invoiceNumber, amount, partNumber, partName, quantity };
  }

  return {};
}

/**
 * Standardizes payloads for various automation proposals before queuing them.
 */
export function compileProposalPayload(type: string, data: Record<string, unknown>): Record<string, unknown> {
  if (type === "lead_follow_up") {
    return {
      leadId: data.leadId || null,
      messageChannel: data.messageChannel || "whatsapp",
      messageBody: data.messageBody || "",
      campaignName: data.campaignName || "Autonomous Lead Nurturing",
      scheduledAt: data.scheduledAt || new Date().toISOString(),
    };
  }

  if (type === "parts_reorder") {
    return {
      partId: data.partId || null,
      partNumber: data.partNumber || "",
      partName: data.partName || "",
      supplierId: data.supplierId || null,
      supplierName: data.supplierName || "",
      quantity: data.quantity || 10,
      estimatedUnitCost: data.estimatedUnitCost || 0,
      currencyCode: data.currencyCode || "AED",
    };
  }

  if (type === "vehicle_marketing") {
    return {
      vehicleId: data.vehicleId || null,
      vin: data.vin || "",
      platforms: data.platforms || ["Facebook Marketplace", "Dubizzle", "Instagram"],
      headline: data.headline || "",
      description: data.description || "",
      askingPrice: data.askingPrice || 0,
      currencyCode: data.currencyCode || "AED",
    };
  }

  return data;
}
