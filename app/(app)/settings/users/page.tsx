import { getCompanyUsers } from "@/features/users/queries";
import { getBusinessRoleOption } from "@/lib/auth/business-roles";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CompanyUserRow = {
  id: string;
  status: string;
  profiles: { full_name: string; email: string; business_role: string } | { full_name: string; email: string; business_role: string }[] | null;
  roles: { name: string; role_key: string }[];
};

export default async function UsersPage() {
  const { companyId } = await getCurrentWorkspace();
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
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Profile category</th>
                  <th className="px-4 py-3">Assigned roles</th>
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
                        <Badge variant="outline">{getBusinessRoleOption(profile?.business_role).label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {membership.roles.length > 0 ? (
                            membership.roles.map((role) => (
                              <Badge key={role.role_key} variant="secondary">{role.name}</Badge>
                            ))
                          ) : (
                            <span className="text-slate-500">No role assigned</span>
                          )}
                        </div>
                      </td>
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
