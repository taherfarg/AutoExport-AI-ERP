import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function RolesPage() {
  const { companyId } = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, name, role_key, description, scope")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Roles</h2>
        <p className="text-sm text-slate-500">
          Review permission groups configured for this company.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
              <CardDescription>
                {role.role_key} - {role.scope}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{role.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
