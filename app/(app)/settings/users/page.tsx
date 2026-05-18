import { getCompanyUsers } from "@/features/users/queries";
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

type CompanyUserRow = {
  id: string;
  status: string;
  profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
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

export default async function UsersPage() {
  const companyId = await getCurrentCompanyId();
  const users = (await getCompanyUsers(companyId)) as unknown as CompanyUserRow[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Users</h2>
        <p className="text-sm text-slate-500">View company members and assigned roles.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Company users</CardTitle>
          <CardDescription>{users.length} memberships returned through RLS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((membership) => {
                  const profile = Array.isArray(membership.profiles)
                    ? membership.profiles[0]
                    : membership.profiles;

                  return (
                    <tr key={membership.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{profile?.full_name}</td>
                      <td className="px-4 py-3">{profile?.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{membership.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
