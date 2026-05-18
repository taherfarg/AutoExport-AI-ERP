import { requireUser } from "@/lib/auth/require-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type MembershipRow = {
  company_id: string;
};

type ProfileRow = {
  id: string;
  email: string;
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
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("auth_user_id", user.id)
    .single();

  const typedProfile = profile as ProfileRow | null;

  if (profileError || !typedProfile) {
    throw new Error("Current workspace was not found.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("company_id")
    .eq("profile_id", typedProfile.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const typedMembership = membership as MembershipRow | null;

  if (membershipError || !typedMembership) {
    throw new Error("Current workspace was not found.");
  }

  return {
    profileId: typedProfile.id,
    email: typedProfile.email,
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
