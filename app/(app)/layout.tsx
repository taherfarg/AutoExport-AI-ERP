import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { getEnabledModuleKeys } from "@/features/subscriptions/queries";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

type CompanyMembershipRow = {
  company_id: string;
  companies: { name: string } | { name: string }[] | null;
};

type ProfileWorkspaceRow = {
  id: string;
  email: string;
  company_memberships: CompanyMembershipRow[];
};

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, email, company_memberships(company_id, companies(name))")
    .eq("auth_user_id", user.id)
    .single();

  const profile = data as unknown as ProfileWorkspaceRow | null;
  const membership = profile?.company_memberships?.[0];

  if (!profile || !membership) {
    redirect("/onboarding/company");
  }

  const company = Array.isArray(membership.companies)
    ? membership.companies[0]
    : membership.companies;
  const enabledModuleKeys = await getEnabledModuleKeys(membership.company_id);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar enabledModuleKeys={enabledModuleKeys} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar companyName={company?.name ?? "Workspace"} userEmail={profile.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
