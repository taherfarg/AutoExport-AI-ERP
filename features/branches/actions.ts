"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createBranchSchema } from "@/lib/validations/branch";

export async function createBranch(formData: FormData) {
  const parsed = createBranchSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    code: formData.get("code"),
    countryCode: formData.get("countryCode"),
    city: formData.get("city"),
    currencyCode: formData.get("currencyCode"),
  });

  if (!parsed.success) {
    return { error: "Branch details are invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({
    company_id: parsed.data.companyId,
    name: parsed.data.name,
    code: parsed.data.code,
    country_code: parsed.data.countryCode,
    city: parsed.data.city,
    currency_code: parsed.data.currencyCode,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/branches");
}
