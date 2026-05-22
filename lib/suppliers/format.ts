export function formatSupplierCategory(category: string) {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSupplierRisk(risk: string) {
  if (risk === "high") return "High Risk";
  if (risk === "medium") return "Watch";
  return "Healthy";
}

export function makeSupplierCode(name: string) {
  const prefix = name
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join("");
  return `SUP-${prefix || "VEN"}-${Date.now().toString(36).toUpperCase()}`;
}
