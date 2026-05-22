import { MODULE_REGISTRY } from "@/lib/modules/module-registry";

type ModuleRegistryEntry = (typeof MODULE_REGISTRY)[number];

export type ModuleAccessResult = {
  allowed: boolean;
  moduleKey: ModuleRegistryEntry["key"];
  gateKey: ModuleRegistryEntry["key"] | string;
  href: ModuleRegistryEntry["href"];
  label: ModuleRegistryEntry["label"];
};

function normalizePath(pathname: string) {
  const [path] = pathname.split("?");
  if (!path || path === "/") return "/";
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function moduleGateKey(module: ModuleRegistryEntry) {
  return "gateKey" in module ? module.gateKey : module.key;
}

export function getModuleAccessForPath(
  pathname: string,
  enabledModuleKeys: string[],
): ModuleAccessResult | null {
  const normalizedPath = normalizePath(pathname);
  const enabled = new Set(enabledModuleKeys);
  const moduleEntry = [...MODULE_REGISTRY]
    .filter((entry) => normalizedPath === entry.href || normalizedPath.startsWith(`${entry.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!moduleEntry) return null;

  const gateKey = moduleGateKey(moduleEntry);
  const allowed = enabled.has(gateKey) || moduleEntry.key === "branches" || moduleEntry.key === "settings";

  return {
    allowed,
    moduleKey: moduleEntry.key,
    gateKey,
    href: moduleEntry.href,
    label: moduleEntry.label,
  };
}
