import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CompanySettingsRow = {
  branding: Record<string, unknown>;
  localization: Record<string, unknown>;
};

type CompanyRow = {
  name: string;
  legal_name: string | null;
  primary_country_code: string;
  primary_currency_code: string;
  default_language: string;
  timezone: string;
  company_settings: CompanySettingsRow | CompanySettingsRow[] | null;
};

type MembershipRow = {
  companies: CompanyRow | CompanyRow[] | null;
};

type ProfileCompanyRow = {
  company_memberships: MembershipRow[];
};

export default async function CompanySettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "company_memberships(companies(name, legal_name, primary_country_code, primary_currency_code, default_language, timezone, company_settings(branding, localization)))",
    )
    .eq("auth_user_id", user.id)
    .single();

  const profile = data as unknown as ProfileCompanyRow | null;

  if (error || !profile?.company_memberships?.[0]) {
    throw new Error("Company settings were not found.");
  }

  const membership = profile.company_memberships[0];
  const company = Array.isArray(membership.companies)
    ? membership.companies[0]
    : membership.companies;
  const settings = Array.isArray(company?.company_settings)
    ? company?.company_settings[0]
    : company?.company_settings;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Company settings</h2>
        <p className="text-sm text-slate-500">White-label identity and localization defaults.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{company?.name}</CardTitle>
          <CardDescription>{company?.legal_name ?? "Legal name not set"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <span>Country: {company?.primary_country_code}</span>
          <span>Currency: {company?.primary_currency_code}</span>
          <span>Language: {company?.default_language}</span>
          <span>Timezone: {company?.timezone}</span>
          <span>Branding: {JSON.stringify(settings?.branding ?? {})}</span>
          <span>Localization: {JSON.stringify(settings?.localization ?? {})}</span>
        </CardContent>
      </Card>
    </div>
  );
}
