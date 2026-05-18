import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PackageRow = {
  name: string;
  package_key: string;
  max_branches: number | null;
  max_users: number | null;
  max_vehicles: number | null;
};

export default async function SubscriptionsPage() {
  const { companyId } = await getCurrentWorkspace();
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
