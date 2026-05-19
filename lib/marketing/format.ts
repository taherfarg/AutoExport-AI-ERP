export function formatMarketingStatus(value: string) {
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function makeMarketingNumber(prefix: string, timestamp = Date.now()) {
  return `${prefix}-${timestamp.toString(36).toUpperCase()}`;
}
