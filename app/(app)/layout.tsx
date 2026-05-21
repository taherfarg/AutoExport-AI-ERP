import { redirect } from "next/navigation";
import { AppMobileNav, AppSidebar } from "@/components/app-shell/app-sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { getEnabledModuleKeys } from "@/features/subscriptions/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspace;
  try {
    workspace = await getCurrentWorkspace();
  } catch {
    redirect("/onboarding/company");
  }

  const supabase = createServiceRoleClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", workspace.companyId)
    .single();
  const enabledModuleKeys = await getEnabledModuleKeys(workspace.companyId);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50">
      <AppSidebar enabledModuleKeys={enabledModuleKeys} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar companyName={company?.name ?? "Workspace"} userEmail={workspace.email} />
        <AppMobileNav enabledModuleKeys={enabledModuleKeys} />
        <main className="w-full min-w-0 flex-1 px-4 py-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
