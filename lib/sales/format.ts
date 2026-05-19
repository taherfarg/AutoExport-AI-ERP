export function formatSalesStatus(value: string) {
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function makeDocumentNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

