import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  id: string;
  status: string;
  profile_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  business_role: string;
};

type UserRoleRow = {
  profile_id: string;
  roles: { name: string; role_key: string } | { name: string; role_key: string }[] | null;
};

export async function getCompanyUsers(companyId: string) {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("company_memberships")
    .select("id, status, profile_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const typedMemberships = (memberships ?? []) as MembershipRow[];
  const profileIds = typedMemberships.map((membership) => membership.profile_id);

  if (profileIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, business_role")
    .in("id", profileIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  const { data: userRoles, error: userRolesError } = await supabase
    .from("user_roles")
    .select("profile_id, roles(name, role_key)")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .in("profile_id", profileIds);

  if (userRolesError) {
    throw new Error(userRolesError.message);
  }

  const rolesByProfileId = new Map<string, { name: string; role_key: string }[]>();
  for (const userRole of (userRoles ?? []) as UserRoleRow[]) {
    const roles = Array.isArray(userRole.roles) ? userRole.roles : userRole.roles ? [userRole.roles] : [];
    rolesByProfileId.set(userRole.profile_id, [
      ...(rolesByProfileId.get(userRole.profile_id) ?? []),
      ...roles,
    ]);
  }

  return typedMemberships.map((membership) => ({
    id: membership.id,
    status: membership.status,
    profiles: profileById.get(membership.profile_id) ?? null,
    roles: rolesByProfileId.get(membership.profile_id) ?? [],
  }));
}
