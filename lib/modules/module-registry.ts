import {
  BarChart3,
  Bot,
  Building2,
  Car,
  Calculator,
  ClipboardList,
  MessageSquareText,
  FileText,
  Globe2,
  Megaphone,
  Receipt,
  Settings,
  Ship,
  Siren,
  Users,
  WalletCards,
  Handshake,
  Landmark,
  Package,
  Wrench,
} from "lucide-react";

export const MODULE_REGISTRY = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { key: "vehicles", label: "Vehicle Inventory", href: "/vehicles", icon: Car },
  { key: "vehicle_pricing", gateKey: "vehicles", label: "Smart Pricing", href: "/vehicles/pricing", icon: Calculator },
  { key: "global_stock", label: "Global Stock", href: "/global-stock", icon: Globe2 },
  { key: "crm", label: "Sales CRM", href: "/crm/leads", icon: ClipboardList },
  { key: "crm_customers", gateKey: "crm", label: "Customers", href: "/crm/customers", icon: Users },
  { key: "sales", label: "Sales", href: "/sales/quotations", icon: Receipt },
  { key: "deal_desk", label: "Deal Desk", href: "/sales/deals", icon: Handshake },
  { key: "export", label: "Import & Export", href: "/export/orders", icon: Ship },
  { key: "documents", label: "Documents", href: "/documents", icon: FileText },
  { key: "finance", label: "Finance Lite", href: "/finance", icon: WalletCards },
  { key: "accounting", gateKey: "finance", label: "Accounting", href: "/finance/accounting", icon: Landmark },
  { key: "suppliers", gateKey: "finance", label: "Suppliers", href: "/finance/suppliers", icon: Handshake },
  { key: "service", label: "Service Workshop", href: "/service/workshop", icon: Wrench },
  { key: "parts", label: "Parts Inventory", href: "/parts/inventory", icon: Package },
  { key: "marketing", label: "Marketing", href: "/marketing/listings", icon: Megaphone },
  { key: "ai", label: "AI Intelligence", href: "/ai", icon: Bot },
  { key: "ai_automation", gateKey: "ai", label: "Advanced AI", href: "/ai/automation", icon: Bot },
  { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { key: "alerts", label: "Smart Alerts", href: "/operations/alerts", icon: Siren },
  { key: "chat", label: "Chat Center", href: "/chat", icon: MessageSquareText },
  { key: "settings", label: "Settings", href: "/settings/company", icon: Settings },
  { key: "branches", label: "Branches", href: "/settings/branches", icon: Building2 },
] as const;

export type ModuleKey = (typeof MODULE_REGISTRY)[number]["key"];

export function filterModulesByPackage(enabledKeys: string[]) {
  const enabled = new Set(enabledKeys);
  return MODULE_REGISTRY.filter((module) => {
    const gateKey = "gateKey" in module ? module.gateKey : module.key;
    return enabled.has(gateKey) || module.key === "branches";
  });
}

export function getModulesWithAccess(enabledKeys: string[]) {
  const enabled = new Set(enabledKeys);

  return MODULE_REGISTRY.map((module) => {
    const gateKey = "gateKey" in module ? module.gateKey : module.key;
    const unlocked = enabled.has(gateKey) || module.key === "branches" || module.key === "settings";

    return {
      ...module,
      unlocked,
      gateKey,
    };
  });
}
