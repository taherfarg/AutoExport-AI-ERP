import { CompanyOnboardingForm } from "@/components/onboarding/company-onboarding-form";
import { ensureProfileForUser } from "@/lib/auth/profiles";
import { requireUser } from "@/lib/auth/require-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { redirect } from "next/navigation";

export default async function CompanyOnboardingPage() {
  const user = await requireUser();
  const profile = await ensureProfileForUser(user);
  const supabase = createServiceRoleClient();

  const { data: membership } = await supabase
    .from("company_memberships")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <CompanyOnboardingForm />
    </main>
  );
}
