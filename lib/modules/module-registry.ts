import {
  BarChart3,
  Bot,
  Building2,
  Car,
  ClipboardList,
  MessageSquareText,
  FileText,
  Globe2,
  Megaphone,
  Receipt,
  Settings,
  Ship,
  Siren,
  WalletCards,
} from "lucide-react";

export const MODULE_REGISTRY = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { key: "vehicles", label: "Vehicle Inventory", href: "/vehicles", icon: Car },
  { key: "global_stock", label: "Global Stock", href: "/global-stock", icon: Globe2 },
  { key: "crm", label: "Sales CRM", href: "/crm/leads", icon: ClipboardList },
  { key: "sales", label: "Sales", href: "/sales/quotations", icon: Receipt },
  { key: "export", label: "Import & Export", href: "/export/orders", icon: Ship },
  { key: "documents", label: "Documents", href: "/documents", icon: FileText },
  { key: "finance", label: "Finance Lite", href: "/finance", icon: WalletCards },
  { key: "marketing", label: "Marketing", href: "/marketing/listings", icon: Megaphone },
  { key: "ai", label: "AI Intelligence", href: "/ai", icon: Bot },
  { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { key: "alerts", label: "Smart Alerts", href: "/operations/alerts", icon: Siren },
  { key: "chat", label: "Chat Center", href: "/chat", icon: MessageSquareText },
  { key: "settings", label: "Settings", href: "/settings/company", icon: Settings },
  { key: "branches", label: "Branches", href: "/settings/branches", icon: Building2 },
] as const;

export type ModuleKey = (typeof MODULE_REGISTRY)[number]["key"];

export function filterModulesByPackage(enabledKeys: string[]) {
  const enabled = new Set(enabledKeys);
  return MODULE_REGISTRY.filter((module) => enabled.has(module.key) || module.key === "branches");
}
