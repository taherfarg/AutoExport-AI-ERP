import * as React from "react";
import { getCurrentWorkspace, getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { getCommunicationProviders, getMessageTemplates } from "@/features/crm/queries";
import { ProviderManager } from "@/components/crm/provider-manager";
import { TemplateManager } from "@/components/crm/template-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CommunicationSettingsPage() {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  // Authorize
  if (!permissions.has("manage_communications")) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
        <Card className="border-red-100 bg-red-50/20">
          <CardHeader>
            <CardTitle className="text-red-950 font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              Permission Denied
            </CardTitle>
            <CardDescription className="text-red-800">
              You do not have the required permissions to access this configuration page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-red-900/80">
            Please ask your administrator to grant the &quot;CRM Communication Channels Manager&quot; (manage_communications) permission key.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch initial server side records
  const [providers, templates] = await Promise.all([
    getCommunicationProviders(workspace.companyId),
    getMessageTemplates(workspace.companyId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Communications Channel Manager</h2>
        <p className="text-sm text-slate-500">
          Integrate WhatsApp Cloud API, SMTP servers, and Twilio SMS. Manage consent templates.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Channel Gateways
          </h3>
          <ProviderManager companyId={workspace.companyId} initialProviders={providers} />
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Message Templates
          </h3>
          <TemplateManager companyId={workspace.companyId} initialTemplates={templates} />
        </div>
      </div>
    </div>
  );
}
