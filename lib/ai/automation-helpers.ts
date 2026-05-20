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

/**
 * Extracts key fields from raw OCR text using regex heuristics.
 */
export function parseOcrFields(docType: string, contentText: string): Record<string, any> {
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

    return { vin, make, model, year, color } as ParsedVehicleTitle;
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

    return { supplierName, invoiceNumber, amount, partNumber, partName, quantity } as ParsedSupplierInvoice;
  }

  return {};
}

/**
 * Standardizes payloads for various automation proposals before queuing them.
 */
export function compileProposalPayload(type: string, data: Record<string, any>): Record<string, any> {
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
