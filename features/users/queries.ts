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
    .select("id, full_name, email")
    .in("id", profileIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return typedMemberships.map((membership) => ({
    id: membership.id,
    status: membership.status,
    profiles: profileById.get(membership.profile_id) ?? null,
  }));
}
