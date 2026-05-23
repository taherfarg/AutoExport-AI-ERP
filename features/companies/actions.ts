"use server";

import { requireUser } from "@/lib/auth/require-user";
import { DEFAULT_COMPANY_ROLE_TEMPLATES } from "@/lib/auth/business-roles";
import { ensureProfileForUser } from "@/lib/auth/profiles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createCompanySchema } from "@/lib/validations/company";

export async function createCompany(formData: FormData) {
  const user = await requireUser();
  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName") || undefined,
    slug: formData.get("slug"),
    countryCode: formData.get("countryCode"),
    currencyCode: formData.get("currencyCode"),
  });

  if (!parsed.success) {
    return { error: "Company details are invalid." };
  }

  const supabase = createServiceRoleClient();

  let profile;
  try {
    profile = await ensureProfileForUser(user);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Profile could not be prepared for the signed-in user." };
  }

  const { data: starterPackage, error: packageError } = await supabase
    .from("packages")
    .select("id")
    .eq("package_key", "starter")
    .single();

  if (packageError || !starterPackage) {
    return { error: "Starter package is not configured." };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: parsed.data.name,
      legal_name: parsed.data.legalName,
      slug: parsed.data.slug,
      primary_country_code: parsed.data.countryCode,
      primary_currency_code: parsed.data.currencyCode,
      status: "trial",
    })
    .select("id")
    .single();

  if (companyError || !company) {
    return { error: companyError?.message ?? "Company could not be created." };
  }

  const { data: permissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("id, permission_key");

  if (permissionsError || !permissions?.length) {
    return { error: "Permissions are not configured." };
  }

  const { data: ownerRole, error: roleError } = await supabase
    .from("roles")
    .insert({
      company_id: company.id,
      name: "Company Owner",
      role_key: "company_owner",
      description: "Full administrative access to the company workspace.",
      scope: "company",
      is_system_role: true,
      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (roleError || !ownerRole) {
    return { error: roleError?.message ?? "Owner role could not be created." };
  }

  await supabase.from("role_permissions").insert(
    permissions.map((permission) => ({
      company_id: company.id,
      role_id: ownerRole.id,
      permission_id: permission.id,
    })),
  );

  const { data: defaultRoles, error: defaultRolesError } = await supabase
    .from("roles")
    .insert(
      DEFAULT_COMPANY_ROLE_TEMPLATES.map((role) => ({
        company_id: company.id,
        name: role.name,
        role_key: role.roleKey,
        description: role.description,
        scope: "company",
        is_system_role: true,
        created_by: profile.id,
        updated_by: profile.id,
      })),
    )
    .select("id, role_key");

  if (defaultRolesError || !defaultRoles) {
    return { error: defaultRolesError?.message ?? "Default company roles could not be created." };
  }

  const permissionIdByKey = new Map(permissions.map((permission) => [permission.permission_key, permission.id]));
  const roleIdByKey = new Map(defaultRoles.map((role) => [role.role_key, role.id]));
  const defaultRolePermissions = DEFAULT_COMPANY_ROLE_TEMPLATES.flatMap((role) => {
    const roleId = roleIdByKey.get(role.roleKey);
    if (!roleId) {
      return [];
    }

    return role.permissionKeys.flatMap((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);
      return permissionId
        ? [{
          company_id: company.id,
          role_id: roleId,
          permission_id: permissionId,
        }]
        : [];
    });
  });

  if (defaultRolePermissions.length > 0) {
    const { error: defaultRolePermissionsError } = await supabase.from("role_permissions").insert(defaultRolePermissions);
    if (defaultRolePermissionsError) {
      return { error: defaultRolePermissionsError.message };
    }
  }

  await supabase.from("company_memberships").insert({
    company_id: company.id,
    profile_id: profile.id,
    status: "active",
    joined_at: new Date().toISOString(),
  });

  await supabase.from("user_roles").insert({
    company_id: company.id,
    profile_id: profile.id,
    role_id: ownerRole.id,
  });

  await supabase.from("company_settings").insert({
    company_id: company.id,
    branding: { primaryColor: "#f97316", secondaryColor: "#2563eb" },
    localization: { language: "en", rtl: false },
  });

  await supabase.from("subscriptions").insert({
    company_id: company.id,
    package_id: starterPackage.id,
    status: "trialing",
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: profile.id,
  });

  return { success: true };
}
