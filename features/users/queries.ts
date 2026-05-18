import { createClient } from "@/lib/supabase/server";

export async function getCompanyUsers(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_memberships")
    .select("id, status, profiles(id, full_name, email), user_roles(roles(name))")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
