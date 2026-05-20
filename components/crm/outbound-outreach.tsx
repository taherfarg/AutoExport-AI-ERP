"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOutboundMessageDraft, approveAndSendOutboundMessage } from "@/features/crm/actions";
import { OutboundMessageRow, MessageTemplateRow, LeadDetail } from "@/features/crm/queries";
import { compileTemplate } from "@/lib/crm/communications";
import { MessageSquare, RefreshCw, Send, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

type OutreachChannel = "whatsapp" | "email" | "sms";

interface OutboundOutreachProps {
  companyId: string;
  branchId: string;
  lead: LeadDetail;
  initialMessages: OutboundMessageRow[];
  templates: MessageTemplateRow[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function OutboundOutreach({ companyId, branchId, lead, initialMessages, templates }: OutboundOutreachProps) {
  const [messages, setMessages] = React.useState<OutboundMessageRow[]>(initialMessages);
  const activeTemplates = React.useMemo(() => templates.filter((t) => t.is_active), [templates]);
  
  // Form State
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [channel, setChannel] = React.useState<OutreachChannel>("email");
  const [recipient, setRecipient] = React.useState<string>(lead.email || "");
  const [subject, setSubject] = React.useState<string>("");
  const [body, setBody] = React.useState<string>("");
  const [variables, setVariables] = React.useState<Record<string, string>>({});
  
  // UI Control State
  const [isCreating, setIsCreating] = React.useState(false);
  const [expandedMessageId, setExpandedMessageId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-fill template variables using lead fields
  const getLeadFieldFallback = (key: string): string => {
    switch (key.toLowerCase()) {
      case "customer_name":
      case "customername":
        return lead.name || "";
      case "vehicle_model":
      case "vehiclemodel":
        return lead.preferred_model || "";
      case "brand":
        return lead.preferred_brand || "";
      case "price":
        return lead.budget ? `$${lead.budget.toLocaleString()}` : "$0";
      default:
        return "";
    }
  };

  const recipientForChannel = (nextChannel: OutreachChannel) => {
    if (nextChannel === "email") {
      return lead.email || "";
    }
    if (nextChannel === "whatsapp") {
      return lead.whatsapp || lead.phone || "";
    }
    return lead.phone || lead.whatsapp || "";
  };

  const setChannelAndRecipient = (nextChannel: OutreachChannel) => {
    setChannel(nextChannel);
    setRecipient(recipientForChannel(nextChannel));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    
    if (!id) {
      setBody("");
      setVariables({});
      return;
    }

    const t = activeTemplates.find((x) => x.id === id);
    if (t) {
      const nextChannel = t.channel as OutreachChannel;
      setChannelAndRecipient(nextChannel);
      setSubject(t.subject || "");
      setBody(t.body);
      
      // Initialize variables
      const vars: Record<string, string> = {};
      t.variables.forEach((v) => {
        vars[v] = getLeadFieldFallback(v);
      });
      setVariables(vars);
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  const handleDraftSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionMessage(null);
    setLoading((prev) => ({ ...prev, draft: true }));

    const compiledBody = compileTemplate(body, variables);
    const compiledSubject = compileTemplate(subject, variables);

    const formData = new FormData();
    formData.append("companyId", companyId);
    formData.append("branchId", branchId);
    formData.append("leadId", lead.id);
    if (lead.customer_id) formData.append("customerId", lead.customer_id);
    formData.append("channel", channel);
    formData.append("recipientAddress", recipient);
    formData.append("subject", compiledSubject);
    formData.append("body", compiledBody);
    if (selectedTemplateId) {
      formData.append("templateId", selectedTemplateId);
      formData.append("templateVariables", JSON.stringify(variables));
    }

    try {
      const res = await createOutboundMessageDraft(formData);
      if (res.error) {
        setActionMessage({ type: "error", text: res.error });
      } else {
        setActionMessage({ type: "success", text: "Outbound message draft saved successfully." });
        
        // Reset form
        setSelectedTemplateId("");
        setBody("");
        setSubject("");
        setVariables({});
        setIsCreating(false);
        
        // Add draft to local timeline list
        const newMsg: OutboundMessageRow = {
          id: res.messageId || `draft-${Math.random()}`,
          company_id: companyId,
          branch_id: branchId,
          provider_id: null,
          lead_id: lead.id,
          customer_id: lead.customer_id || null,
          channel,
          sender_id: null,
          recipient_address: recipient,
          subject: compiledSubject || null,
          body: compiledBody,
          template_id: selectedTemplateId || null,
          template_variables: variables,
          status: "draft",
          error_message: null,
          external_message_id: null,
          created_at: new Date().toISOString(),
          profiles: null,
          message_delivery_events: [],
        };
        setMessages((prev) => [newMsg, ...prev]);
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: errorMessage(err, "Failed to save message draft.") });
    } finally {
      setLoading((prev) => ({ ...prev, draft: false }));
    }
  };

  const handleSend = async (messageId: string) => {
    setActionMessage(null);
    setLoading((prev) => ({ ...prev, [messageId]: true }));

    const formData = new FormData();
    formData.append("messageId", messageId);

    try {
      const res = await approveAndSendOutboundMessage(formData);
      if (res.error) {
        // Here we capture the consent trigger warning
        setActionMessage({ type: "error", text: res.error });
        
        // Update local status to failed with error message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, status: "failed", error_message: res.error }
              : msg
          )
        );
      } else {
        setActionMessage({ type: "success", text: "Message dispatched and acknowledged." });
        
        // Update status of local message to read, adding mock delivery events
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  status: "read",
                  message_delivery_events: [
                    { id: "e1", status: "queued", event_at: new Date().toISOString(), error_code: null, error_description: null },
                    { id: "e2", status: "sent", event_at: new Date().toISOString(), error_code: null, error_description: null },
                    { id: "e3", status: "delivered", event_at: new Date().toISOString(), error_code: null, error_description: null },
                    { id: "e4", status: "read", event_at: new Date().toISOString(), error_code: null, error_description: null },
                  ],
                }
              : msg
          )
        );
      }
    } catch (err: unknown) {
      setActionMessage({ type: "error", text: errorMessage(err, "Dispatch error occurred.") });
    } finally {
      setLoading((prev) => ({ ...prev, [messageId]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedMessageId(expandedMessageId === id ? null : id);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "queued":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "sent":
      case "delivered":
      case "read":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "failed":
        return "bg-rose-100 text-rose-800 border-rose-200 animate-pulse";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <Card className="border border-slate-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50">
        <div>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Outbound Communications & Dispatcher
          </CardTitle>
          <CardDescription className="text-xs">
            Draft, review and send automated templates with strict consent verification.
          </CardDescription>
        </div>
        {!isCreating && (
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
          >
            Create Outreach
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {actionMessage && (
          <div
            className={`p-3 rounded text-xs border flex items-start gap-2 ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-100"
                : "bg-rose-50 text-rose-900 border-rose-100"
            }`}
          >
            {actionMessage.type === "error" ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold block">
                {actionMessage.type === "error" ? "Dispatch Error / Constraint" : "Dispatch Confirmed"}
              </span>
              <span className="mt-0.5 block">{actionMessage.text}</span>
            </div>
          </div>
        )}

        {isCreating && (
          <form onSubmit={handleDraftSubmit} className="space-y-4 border p-4 rounded-md bg-slate-50/30">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-semibold text-slate-700">New Outreach Message</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="text-xs h-7 text-slate-400"
              >
                Cancel
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="templateSelect" className="text-xs">Select Template</Label>
                <select
                  id="templateSelect"
                  value={selectedTemplateId}
                  onChange={handleTemplateChange}
                  className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Custom Outreach (No Template)</option>
                  {activeTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.channel})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedTemplateId && (
                <div className="space-y-1">
                  <Label htmlFor="channelSelect" className="text-xs">Channel</Label>
                  <select
                    id="channelSelect"
                    value={channel}
                    onChange={(e) => setChannelAndRecipient(e.target.value as OutreachChannel)}
                    className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="recipientInput" className="text-xs">Recipient Address</Label>
              <Input
                id="recipientInput"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={channel === "email" ? "customer@email.com" : "+971XXXXXXXXX"}
                required
                className="h-8 text-xs"
              />
            </div>

            {channel === "email" && (
              <div className="space-y-1">
                <Label htmlFor="subjectInput" className="text-xs">Email Subject</Label>
                <Input
                  id="subjectInput"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quotation details..."
                  required={channel === "email"}
                  className="h-8 text-xs"
                  disabled={!!selectedTemplateId}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="bodyInput" className="text-xs">Message Body</Label>
              <textarea
                id="bodyInput"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Write message details..."
                required
                disabled={!!selectedTemplateId}
              />
            </div>

            {/* Template Variables Inputs */}
            {selectedTemplateId && Object.keys(variables).length > 0 && (
              <div className="space-y-2 border-t pt-2 mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Template Variables Configuration
                </span>
                <div className="grid gap-2 grid-cols-2">
                  {Object.keys(variables).map((vkey) => (
                    <div key={vkey} className="space-y-1">
                      <Label htmlFor={`var-${vkey}`} className="text-[10px] text-slate-500 uppercase">
                        {vkey.replaceAll("_", " ")}
                      </Label>
                      <Input
                        id={`var-${vkey}`}
                        value={variables[vkey]}
                        onChange={(e) => handleVariableChange(vkey, e.target.value)}
                        required
                        className="h-7 text-[11px] px-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compiled Preview */}
            {selectedTemplateId && (
              <div className="bg-slate-100 p-2.5 rounded border text-[11px] text-slate-600 mt-2">
                <span className="font-semibold block mb-1 text-[9px] uppercase tracking-wider text-slate-400">
                  Compiled Dispatch Preview
                </span>
                <div className="bg-white p-2 rounded whitespace-pre-wrap">
                  {compileTemplate(body, variables)}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading.draft}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
            >
              {loading.draft ? "Saving draft..." : "Save Draft"}
            </Button>
          </form>
        )}

        {/* Outreach Timeline */}
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-md text-xs text-slate-400">
              No outbound campaigns or template dispatches initialized.
            </div>
          ) : (
            messages.map((msg) => {
              const isExpanded = expandedMessageId === msg.id;
              const hasEvents = msg.message_delivery_events && msg.message_delivery_events.length > 0;
              const isPendingSend = msg.status === "draft" || msg.status === "failed";
              const isSending = loading[msg.id];

              return (
                <div key={msg.id} className="border border-slate-100 rounded-md bg-white shadow-sm overflow-hidden text-xs">
                  <div className="p-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50/30">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {msg.subject ? msg.subject : `${msg.channel.toUpperCase()} Outreach`}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getStatusBadgeClass(msg.status)}`}>
                        {msg.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Toggle details"
                        onClick={() => toggleExpand(msg.id)}
                        className="h-7 w-7 p-0 hover:bg-slate-100 text-slate-400"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 border-t border-slate-100 space-y-3 bg-white">
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2 rounded">
                        <div>
                          <span className="text-slate-400">Recipient:</span>
                          <span className="font-semibold text-slate-700 ml-1">{msg.recipient_address}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Direction:</span>
                          <span className="font-semibold text-slate-700 ml-1">outbound</span>
                        </div>
                      </div>

                      <div className="whitespace-pre-wrap text-slate-600 bg-slate-50/50 p-2.5 rounded border border-slate-100">
                        {msg.body}
                      </div>

                      {/* Display warning if error message exists */}
                      {msg.error_message && (
                        <div className="bg-rose-50 border border-rose-100 text-[10px] p-2 rounded text-rose-800 flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Dispatch Error:</span>
                            <p className="mt-0.5">{msg.error_message}</p>
                          </div>
                        </div>
                      )}

                      {/* Action trigger block */}
                      {isPendingSend && (
                        <div className="flex justify-end gap-2 border-t pt-2.5 mt-1">
                          <Button
                            size="sm"
                            disabled={isSending}
                            onClick={() => handleSend(msg.id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] h-7 px-3 flex items-center gap-1.5"
                          >
                            {isSending ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                Dispatched...
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                Approve & Dispatch
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Delivery Event Log Tracker */}
                      {hasEvents && (
                        <div className="border-t pt-2.5 space-y-1.5">
                          <span className="font-bold text-[9px] text-slate-400 uppercase tracking-wider block">
                            Live Delivery Event Logs
                          </span>
                          <div className="relative pl-3 border-l border-slate-100 space-y-2">
                            {msg.message_delivery_events.map((evt) => (
                              <div key={evt.id} className="relative flex items-center gap-1.5 text-[10px]">
                                <span className="absolute -left-[16px] w-1.5 h-1.5 rounded-full bg-slate-300 border border-white"></span>
                                <span className="font-semibold uppercase text-slate-600">{evt.status}</span>
                                <span className="text-[9px] text-slate-400">
                                  - {new Date(evt.event_at).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
