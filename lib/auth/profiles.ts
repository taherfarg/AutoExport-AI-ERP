import type { User } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AppProfile = {
  id: string;
  email: string;
};

function getProfileName(user: User) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;

  if (typeof metadataName === "string" && metadataName.trim().length > 0) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] || "Workspace user";
}

export async function ensureProfileForUser(user: User): Promise<AppProfile> {
  const supabase = createServiceRoleClient();
  const { data: existingProfile, error: existingError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingProfile) {
    return existingProfile as AppProfile;
  }

  const email = user.email;

  if (!email) {
    throw new Error("Signed-in user does not have an email address.");
  }

  const { data: createdProfile, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      auth_user_id: user.id,
      full_name: getProfileName(user),
      email,
      status: "active",
    })
    .select("id, email")
    .single();

  if (createError || !createdProfile) {
    throw new Error(createError?.message ?? "Profile could not be created for the signed-in user.");
  }

  return createdProfile as AppProfile;
}
