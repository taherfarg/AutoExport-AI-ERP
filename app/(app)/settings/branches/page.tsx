import { createBranch } from "@/features/branches/actions";
import { getBranches } from "@/features/branches/queries";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MembershipRow = {
  company_id: string;
};

type ProfileMembershipRow = {
  company_memberships: MembershipRow[];
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

export default async function BranchesPage() {
  const companyId = await getCurrentCompanyId();
  const branches = await getBranches(companyId);

  async function createBranchFromForm(formData: FormData) {
    "use server";

    await createBranch(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Branches</h2>
        <p className="text-sm text-slate-500">
          Manage company locations and branch-level access.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add branch</CardTitle>
          <CardDescription>Create a real branch record protected by tenant RLS.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBranchFromForm} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="companyId" value={companyId} />
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="countryCode">Country</Label>
              <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Input id="currencyCode" name="currencyCode" defaultValue="AED" maxLength={3} required />
            </div>
            <div className="flex items-end">
              <Button type="submit">Add branch</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Branch list</CardTitle>
          <CardDescription>{branches.length} active branch records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{branch.name}</td>
                    <td className="px-4 py-3">{branch.code}</td>
                    <td className="px-4 py-3">{branch.city}</td>
                    <td className="px-4 py-3">{branch.currency_code}</td>
                    <td className="px-4 py-3">{branch.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
