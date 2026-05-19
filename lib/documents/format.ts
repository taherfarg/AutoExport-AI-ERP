const SPECIAL_LABELS: Record<string, string> = {
  customer_id_passport: "Customer ID/passport",
  bl_number: "BL number",
};

export function formatDocumentStatus(value: string) {
  if (SPECIAL_LABELS[value]) {
    return SPECIAL_LABELS[value];
  }

  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function makeDocumentNumber(prefix = "DOC", timestamp = Date.now()) {
  return `${prefix}-${timestamp.toString(36).toUpperCase()}`;
}

export function makeSignatureRequestNumber(timestamp = Date.now()) {
  return makeDocumentNumber("SIG", timestamp);
}
