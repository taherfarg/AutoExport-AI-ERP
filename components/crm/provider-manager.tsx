"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertCommunicationProvider } from "@/features/crm/actions";
import { CommunicationProviderRow } from "@/features/crm/queries";

interface ProviderManagerProps {
  companyId: string;
  initialProviders: CommunicationProviderRow[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ProviderManager({ companyId, initialProviders }: ProviderManagerProps) {
  const [providers, setProviders] = React.useState<CommunicationProviderRow[]>(initialProviders);
  const [loading, setLoading] = React.useState<Record<string, boolean>>({});
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Helper to find configuration values or return empty
  const getVal = (type: string, key: string) => {
    const provider = providers.find((p) => p.provider_type === type);
    const value = provider?.config?.[key];
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  };

  const isProviderActive = (type: string) => {
    const provider = providers.find((p) => p.provider_type === type);
    return provider ? provider.is_active : false;
  };

  const getProviderId = (type: string) => {
    const provider = providers.find((p) => p.provider_type === type);
    return provider?.id || "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, type: "whatsapp" | "email" | "sms") => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, [type]: true }));
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.append("companyId", companyId);
    formData.append("providerType", type);

    const id = getProviderId(type);
    if (id) {
      formData.append("id", id);
    }

    // Build the config object from inputs
    const config: Record<string, unknown> = {};
    if (type === "whatsapp") {
      config.phoneNumberId = formData.get("phoneNumberId");
      config.whatsappBusinessAccountId = formData.get("whatsappBusinessAccountId");
      config.accessToken = formData.get("accessToken");
    } else if (type === "email") {
      config.smtpHost = formData.get("smtpHost");
      config.smtpPort = Number(formData.get("smtpPort"));
      config.smtpUser = formData.get("smtpUsername");
      config.smtpPass = formData.get("smtpPassword");
      config.fromEmail = formData.get("fromEmail");
      config.fromName = formData.get("fromName");
    } else if (type === "sms") {
      config.accountSid = formData.get("twilioAccountSid");
      config.authToken = formData.get("twilioAuthToken");
      config.fromNumber = formData.get("twilioPhoneNumber");
    }

    formData.append("config", JSON.stringify(config));

    try {
      const res = await upsertCommunicationProvider(formData);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: `${type.toUpperCase()} settings saved successfully.` });
        
        // Update local state by requesting latest list or updating local record
        // Normally we revalidate path, but we can also update local state
        const updatedProviders = [...providers];
        const idx = updatedProviders.findIndex((p) => p.provider_type === type);
        const newProvider: CommunicationProviderRow = {
          id: id || "temp-id", // Will be refreshed on page reload
          company_id: companyId,
          branch_id: null,
          provider_type: type,
          provider_name: `${type.charAt(0).toUpperCase()}${type.slice(1)} Channel`,
          config,
          is_active: formData.get("isActive") === "true",
        };
        if (idx >= 0) {
          updatedProviders[idx] = newProvider;
        } else {
          updatedProviders.push(newProvider);
        }
        setProviders(updatedProviders);
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: errorMessage(err, "An unexpected error occurred.") });
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-md text-sm transition-all duration-300 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* WhatsApp Card */}
        <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              WhatsApp Business API
            </CardTitle>
            <CardDescription>Configure Cloud API for messaging</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form id="whatsapp-provider-form" onSubmit={(e) => handleSubmit(e, "whatsapp")} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="phoneNumberId" className="text-xs">Phone Number ID</Label>
                <Input
                  id="phoneNumberId"
                  name="phoneNumberId"
                  defaultValue={getVal("whatsapp", "phoneNumberId")}
                  placeholder="e.g. 109432859182390"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="whatsappBusinessAccountId" className="text-xs">Business Account ID</Label>
                <Input
                  id="whatsappBusinessAccountId"
                  name="whatsappBusinessAccountId"
                  defaultValue={getVal("whatsapp", "whatsappBusinessAccountId")}
                  placeholder="e.g. 293847293847293"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="accessToken" className="text-xs">Access Token</Label>
                <Input
                  id="accessToken"
                  name="accessToken"
                  type="password"
                  defaultValue={getVal("whatsapp", "accessToken")}
                  placeholder="Meta System User Token"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="wa-active"
                  name="isActive"
                  value="true"
                  defaultChecked={isProviderActive("whatsapp")}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <Label htmlFor="wa-active" className="text-xs cursor-pointer">Active</Label>
              </div>

              <input type="hidden" name="providerName" value="WhatsApp Cloud Provider" />

              <Button
                type="submit"
                disabled={loading.whatsapp}
                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white transition-all text-xs h-9"
              >
                {loading.whatsapp ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Card */}
        <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              SMTP Gateway
            </CardTitle>
            <CardDescription>Configure SMTP server for quotations</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form id="email-provider-form" onSubmit={(e) => handleSubmit(e, "email")} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="smtpHost" className="text-xs">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    name="smtpHost"
                    defaultValue={getVal("email", "smtpHost")}
                    placeholder="smtp.mailgun.org"
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="smtpPort" className="text-xs">Port</Label>
                  <Input
                    id="smtpPort"
                    name="smtpPort"
                    type="number"
                    defaultValue={getVal("email", "smtpPort")}
                    placeholder="587"
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="smtpUsername" className="text-xs">SMTP Username</Label>
                <Input
                  id="smtpUsername"
                  name="smtpUsername"
                  defaultValue={getVal("email", "smtpUser")}
                  placeholder="postmaster@autosphere.com"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="smtpPassword" className="text-xs">SMTP Password</Label>
                <Input
                  id="smtpPassword"
                  name="smtpPassword"
                  type="password"
                  defaultValue={getVal("email", "smtpPass")}
                  placeholder="SMTP credentials"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="fromEmail" className="text-xs">From Email</Label>
                  <Input
                    id="fromEmail"
                    name="fromEmail"
                    type="email"
                    defaultValue={getVal("email", "fromEmail")}
                    placeholder="sales@autosphere.ae"
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fromName" className="text-xs">From Name</Label>
                  <Input
                    id="fromName"
                    name="fromName"
                    defaultValue={getVal("email", "fromName")}
                    placeholder="AutoSphere Sales"
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="email-active"
                  name="isActive"
                  value="true"
                  defaultChecked={isProviderActive("email")}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <Label htmlFor="email-active" className="text-xs cursor-pointer">Active</Label>
              </div>

              <input type="hidden" name="providerName" value="SMTP Main Provider" />

              <Button
                type="submit"
                disabled={loading.email}
                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white transition-all text-xs h-9"
              >
                {loading.email ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* SMS Card */}
        <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Twilio SMS
            </CardTitle>
            <CardDescription>Configure Twilio API for SMS logs</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form id="sms-provider-form" onSubmit={(e) => handleSubmit(e, "sms")} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="twilioAccountSid" className="text-xs">Account SID</Label>
                <Input
                  id="twilioAccountSid"
                  name="twilioAccountSid"
                  defaultValue={getVal("sms", "accountSid")}
                  placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="twilioAuthToken" className="text-xs">Auth Token</Label>
                <Input
                  id="twilioAuthToken"
                  name="twilioAuthToken"
                  type="password"
                  defaultValue={getVal("sms", "authToken")}
                  placeholder="Twilio Token"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="twilioPhoneNumber" className="text-xs">Twilio Number</Label>
                <Input
                  id="twilioPhoneNumber"
                  name="twilioPhoneNumber"
                  defaultValue={getVal("sms", "fromNumber")}
                  placeholder="e.g. +14155552671"
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sms-active"
                  name="isActive"
                  value="true"
                  defaultChecked={isProviderActive("sms")}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <Label htmlFor="sms-active" className="text-xs cursor-pointer">Active</Label>
              </div>

              <input type="hidden" name="providerName" value="Twilio Provider" />

              <Button
                type="submit"
                disabled={loading.sms}
                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white transition-all text-xs h-9"
              >
                {loading.sms ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
