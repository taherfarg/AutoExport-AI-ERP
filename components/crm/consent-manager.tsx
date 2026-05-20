"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCustomerConsent } from "@/features/crm/actions";
import { CustomerConsentRow } from "@/features/crm/queries";

interface ConsentManagerProps {
  companyId: string;
  leadId?: string;
  customerId?: string;
  initialConsents: CustomerConsentRow[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ConsentManager({ companyId, leadId, customerId, initialConsents }: ConsentManagerProps) {
  const [consents, setConsents] = React.useState<CustomerConsentRow[]>(initialConsents);
  const [loading, setLoading] = React.useState<Record<string, boolean>>({});
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const getConsentStatus = (channel: string): boolean => {
    const c = consents.find((x) => x.channel === channel);
    return c ? c.is_granted : false;
  };

  const handleToggle = async (channel: "whatsapp" | "email" | "sms") => {
    const currentStatus = getConsentStatus(channel);
    const newStatus = !currentStatus;

    setLoading((prev) => ({ ...prev, [channel]: true }));
    setMessage(null);

    const formData = new FormData();
    formData.append("companyId", companyId);
    if (leadId) formData.append("leadId", leadId);
    if (customerId) formData.append("customerId", customerId);
    formData.append("channel", channel);
    formData.append("isGranted", newStatus ? "true" : "false");
    formData.append("consentSource", "ui");

    try {
      const res = await updateCustomerConsent(formData);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: `Consent updated for ${channel.toUpperCase()}.` });
        
        // Update local state
        const updated = [...consents];
        const idx = updated.findIndex((x) => x.channel === channel);
        const newConsent: CustomerConsentRow = {
          id: idx >= 0 ? updated[idx].id : `temp-${channel}`,
          company_id: companyId,
          customer_id: customerId || null,
          lead_id: leadId || null,
          channel,
          is_granted: newStatus,
          consent_source: "ui",
        };

        if (idx >= 0) {
          updated[idx] = newConsent;
        } else {
          updated.push(newConsent);
        }
        setConsents(updated);
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: errorMessage(err, "Failed to update consent.") });
    } finally {
      setLoading((prev) => ({ ...prev, [channel]: false }));
    }
  };

  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardHeader className="bg-slate-50/50 pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Outreach Consent Manager
        </CardTitle>
        <CardDescription className="text-xs">
          Verify and configure legal consent before sending outbound templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {message && (
          <div
            className={`p-2.5 rounded text-xs border ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-100"
                : "bg-rose-50 text-rose-900 border-rose-100"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-3">
          {(["whatsapp", "email", "sms"] as const).map((channel) => {
            const isGranted = getConsentStatus(channel);
            const isLoading = loading[channel];

            return (
              <div key={channel} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase text-slate-700">{channel}</span>
                  <span className={`text-[10px] mt-0.5 font-semibold ${isGranted ? "text-emerald-600" : "text-rose-600"}`}>
                    {isGranted ? "Granted" : "Not Granted"}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant={isGranted ? "outline" : "default"}
                  disabled={isLoading}
                  onClick={() => handleToggle(channel)}
                  className={`text-[10px] h-7 px-3 ${
                    isGranted
                      ? "hover:bg-rose-50 hover:text-rose-700 border-slate-200"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {isLoading ? "Saving..." : isGranted ? "Revoke Consent" : "Grant Consent"}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
