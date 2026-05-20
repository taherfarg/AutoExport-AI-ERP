import { requireUser } from "@/lib/auth/require-user";
import { ensureProfileForUser } from "@/lib/auth/profiles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type MembershipRow = {
  company_id: string;
};

type PermissionRow = {
  roles:
    | {
        role_permissions:
          | {
              permissions: { permission_key: string } | { permission_key: string }[] | null;
            }[]
          | null;
      }
    | {
        role_permissions:
          | {
              permissions: { permission_key: string } | { permission_key: string }[] | null;
            }[]
          | null;
      }[]
    | null;
};

export async function getCurrentWorkspace() {
  const user = await requireUser();
  const supabase = createServiceRoleClient();
  const profile = await ensureProfileForUser(user);

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const typedMembership = membership as MembershipRow | null;

  if (membershipError || !typedMembership) {
    throw new Error("Current workspace was not found.");
  }

  return {
    profileId: profile.id,
    email: profile.email,
    companyId: typedMembership.company_id,
  };
}

export async function getCurrentPermissionSet(companyId: string) {
  const workspace = await getCurrentWorkspace();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(role_permissions(permissions(permission_key)))")
    .eq("company_id", companyId)
    .eq("profile_id", workspace.profileId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as PermissionRow[];
  const permissions = new Set<string>();

  rows.forEach((row) => {
    const roles = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
    roles.forEach((role) => {
      role.role_permissions?.forEach((rolePermission) => {
        const permissionRows = Array.isArray(rolePermission.permissions)
          ? rolePermission.permissions
          : rolePermission.permissions
            ? [rolePermission.permissions]
            : [];
        permissionRows.forEach((permission) => permissions.add(permission.permission_key));
      });
    });
  });

  return permissions;
}
