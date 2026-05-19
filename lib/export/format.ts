export function formatExportStatus(value: string) {
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function makeExportOrderNumber() {
  return `EX-${Date.now().toString(36).toUpperCase()}`;
}

export function makeImportOrderNumber() {
  return `IM-${Date.now().toString(36).toUpperCase()}`;
}
