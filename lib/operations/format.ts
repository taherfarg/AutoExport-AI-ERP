export function formatOperationsStatus(value: string) {
  const label = value
    .split("_")
    .filter(Boolean)
    .join(" ");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function priorityWeight(priority: string) {
  const weights: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return weights[priority] ?? 0;
}

export function makeOperationsNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
