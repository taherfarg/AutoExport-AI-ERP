import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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

export default async function CompanySettingsPage() {
  const workspace = await getCurrentWorkspace();
  const supabase = createServiceRoleClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select(
      "name, legal_name, primary_country_code, primary_currency_code, default_language, timezone, company_settings(branding, localization)",
    )
    .eq("id", workspace.companyId)
    .single();

  const companyRow = company as unknown as CompanyRow | null;

  if (error || !companyRow) {
    throw new Error("Company settings were not found.");
  }

  const settings = Array.isArray(companyRow.company_settings)
    ? companyRow.company_settings[0]
    : companyRow.company_settings;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Company settings</h2>
        <p className="text-sm text-slate-500">White-label identity and localization defaults.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{companyRow.name}</CardTitle>
          <CardDescription>{companyRow.legal_name ?? "Legal name not set"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <span>Country: {companyRow.primary_country_code}</span>
          <span>Currency: {companyRow.primary_currency_code}</span>
          <span>Language: {companyRow.default_language}</span>
          <span>Timezone: {companyRow.timezone}</span>
          <span>Branding: {JSON.stringify(settings?.branding ?? {})}</span>
          <span>Localization: {JSON.stringify(settings?.localization ?? {})}</span>
        </CardContent>
      </Card>
    </div>
  );
}
