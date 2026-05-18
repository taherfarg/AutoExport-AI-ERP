import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MembershipRow = {
  company_id: string;
};

type ProfileMembershipRow = {
  company_memberships: MembershipRow[];
};

type PackageRow = {
  name: string;
  package_key: string;
  max_branches: number | null;
  max_users: number | null;
  max_vehicles: number | null;
};

async function getCurrentCompanyId() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("company_memberships(company_id)")
    .eq("auth_user_id", user.id)
    .single();

  const profile = data as unknown as ProfileMembershipRow | null;

  if (error || !profile?.company_memberships?.[0]?.company_id) {
    throw new Error("Current company was not found.");
  }

  return profile.company_memberships[0].company_id;
}

export default async function SubscriptionsPage() {
  const companyId = await getCurrentCompanyId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, packages(name, package_key, max_branches, max_users, max_vehicles)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const packageData = (Array.isArray(data.packages)
    ? data.packages[0]
    : data.packages) as PackageRow | null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Subscription</h2>
        <p className="text-sm text-slate-500">
          Package access controls modules and usage limits.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{packageData?.name}</CardTitle>
          <CardDescription>{packageData?.package_key}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-4">
          <Badge>{data.status}</Badge>
          <span>Branches: {packageData?.max_branches ?? "Unlimited"}</span>
          <span>Users: {packageData?.max_users ?? "Unlimited"}</span>
          <span>Vehicles: {packageData?.max_vehicles ?? "Unlimited"}</span>
        </CardContent>
      </Card>
    </div>
  );
}
