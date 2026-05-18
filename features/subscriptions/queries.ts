import { createClient } from "@/lib/supabase/server";

type PackageModuleRow = {
  modules: { module_key: string } | { module_key: string }[] | null;
};

type SubscriptionPackageRow = {
  package_modules: PackageModuleRow[];
};

export async function getEnabledModuleKeys(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("packages(package_modules(modules(module_key)))")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (error || !data?.packages) {
    return ["dashboard", "settings"];
  }

  const packageData = data.packages as unknown as SubscriptionPackageRow;

  return packageData.package_modules
    .map((item) => {
      const moduleRow = Array.isArray(item.modules) ? item.modules[0] : item.modules;
      return moduleRow?.module_key;
    })
    .filter((moduleKey): moduleKey is string => Boolean(moduleKey));
}
