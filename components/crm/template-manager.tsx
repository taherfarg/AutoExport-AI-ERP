"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertMessageTemplate } from "@/features/crm/actions";
import { MessageTemplateRow } from "@/features/crm/queries";
import { compileTemplate } from "@/lib/crm/communications";

interface TemplateManagerProps {
  companyId: string;
  initialTemplates: MessageTemplateRow[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function TemplateManager({ companyId, initialTemplates }: TemplateManagerProps) {
  const [templates, setTemplates] = React.useState<MessageTemplateRow[]>(initialTemplates);
  const [filter, setFilter] = React.useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = React.useState<Partial<MessageTemplateRow> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const previewVars: Record<string, string> = {
    customer_name: "John Doe",
    vehicle_model: "Porsche 911 Turbo S",
    price: "$210,000",
    salesperson_name: "Sarah Connors",
  };

  const filtered = templates.filter(
    (t) => filter === "all" || t.channel === filter
  );

  const handleEdit = (template: MessageTemplateRow) => {
    setSelectedTemplate(template);
    setMessage(null);
  };

  const handleAddNew = () => {
    setSelectedTemplate({
      company_id: companyId,
      name: "",
      channel: "email",
      subject: "",
      body: "",
      variables: [],
      language: "en",
      is_active: true,
    });
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setSelectedTemplate(null);
    setMessage(null);
  };

  const parseVariables = (bodyText: string) => {
    const regex = /\{\{([^}]+)\}\}/g;
    const found: string[] = [];
    let match;
    while ((match = regex.exec(bodyText)) !== null) {
      const v = match[1].trim();
      if (!found.includes(v)) {
        found.push(v);
      }
    }
    return found;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.append("companyId", companyId);

    if (selectedTemplate?.id) {
      formData.append("id", selectedTemplate.id);
    }

    const body = formData.get("body")?.toString() || "";
    const variables = parseVariables(body);
    formData.append("variables", JSON.stringify(variables));

    try {
      const res = await upsertMessageTemplate(formData);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Template saved successfully." });
        
        // Refresh templates in state
        const updatedTemplates = [...templates];
        const newTemplate: MessageTemplateRow = {
          id: selectedTemplate?.id || `temp-${Math.random()}`,
          company_id: companyId,
          name: formData.get("name")?.toString() || "",
          channel: formData.get("channel")?.toString() || "email",
          subject: formData.get("subject")?.toString() || null,
          body,
          variables,
          language: formData.get("language")?.toString() || "en",
          is_active: formData.get("isActive") === "true",
        };

        const idx = updatedTemplates.findIndex((t) => t.id === selectedTemplate?.id);
        if (idx >= 0) {
          updatedTemplates[idx] = newTemplate;
        } else {
          updatedTemplates.push(newTemplate);
        }
        setTemplates(updatedTemplates);
        setSelectedTemplate(null);
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: errorMessage(err, "Failed to save template.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && !selectedTemplate && (
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

      {selectedTemplate ? (
        <Card className="border border-slate-100 shadow-lg">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-lg font-semibold">
              {selectedTemplate.id ? "Edit Message Template" : "Create New Message Template"}
            </CardTitle>
            <CardDescription>Define variables using double curly braces: {"{{variable}}"}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Template Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={selectedTemplate.name}
                    placeholder="e.g. Sales Welcome WhatsApp"
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="channel" className="text-xs">Channel</Label>
                  <select
                    id="channel"
                    name="channel"
                    defaultValue={selectedTemplate.channel}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="language" className="text-xs">Language (Locale)</Label>
                  <Input
                    id="language"
                    name="language"
                    defaultValue={selectedTemplate.language}
                    placeholder="en"
                    required
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="subject" className="text-xs">Email Subject (Optional)</Label>
                <Input
                  id="subject"
                  name="subject"
                  defaultValue={selectedTemplate.subject || ""}
                  placeholder="e.g. Quotation for your {{vehicle_model}}"
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="body" className="text-xs">Template Body</Label>
                  <textarea
                    id="body"
                    name="body"
                    defaultValue={selectedTemplate.body}
                    rows={6}
                    className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Hello {{customer_name}}, thank you for choosing AutoSphere..."
                    required
                    onChange={(e) => {
                      // Trigger state change so preview updates if we want to bind it locally
                      setSelectedTemplate(prev => prev ? ({ ...prev, body: e.target.value }) : null);
                    }}
                  />
                </div>

                <div className="space-y-1 bg-slate-50 p-4 rounded-md border border-slate-100">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Live Rendering Preview
                  </Label>
                  <div className="bg-white p-3 rounded border border-slate-200 min-h-[120px] text-sm whitespace-pre-wrap text-slate-700">
                    {compileTemplate(selectedTemplate.body || "", previewVars)}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    Preview using: customer_name, vehicle_model, price, salesperson_name
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tmpl-active"
                  name="isActive"
                  value="true"
                  defaultChecked={selectedTemplate.is_active}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <Label htmlFor="tmpl-active" className="text-xs cursor-pointer">Active and selectable</Label>
              </div>

              <div className="flex items-center gap-2 justify-end pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
                >
                  {loading ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-slate-50/50">
            <div>
              <CardTitle className="text-lg font-semibold">Message Templates</CardTitle>
              <CardDescription>Predefined templates for automated or structured outreach</CardDescription>
            </div>
            <Button
              onClick={handleAddNew}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
            >
              Add Template
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="text-xs"
              >
                All Channels
              </Button>
              <Button
                variant={filter === "whatsapp" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("whatsapp")}
                className="text-xs"
              >
                WhatsApp
              </Button>
              <Button
                variant={filter === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("email")}
                className="text-xs"
              >
                Email
              </Button>
              <Button
                variant={filter === "sms" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("sms")}
                className="text-xs"
              >
                SMS
              </Button>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-md text-sm text-slate-400">
                No templates configured for this selection.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((tmpl) => (
                  <div key={tmpl.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        {tmpl.name}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            tmpl.channel === "whatsapp"
                              ? "bg-emerald-100 text-emerald-800"
                              : tmpl.channel === "email"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {tmpl.channel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {tmpl.body}
                      </div>
                      {tmpl.variables.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {tmpl.variables.map((v) => (
                            <span key={v} className="bg-slate-100 text-slate-600 text-[9px] px-1 rounded">
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tmpl)}
                        className="text-xs px-2.5 h-8"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
