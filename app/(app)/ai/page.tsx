import { redirect } from "next/navigation";
import { Bot, Check, FileSearch, MessageSquareText, ShieldCheck, X } from "lucide-react";
import { AiStatusBadge } from "@/components/ai/ai-status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranches } from "@/features/branches/queries";
import {
  createAiExtractionRequest,
  createAiReportRequest,
  decideAiApproval,
} from "@/features/ai/actions";
import { getAiDashboardData, getAiPermissions } from "@/features/ai/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatAiStatus } from "@/lib/ai/format";
import { AiAskForm } from "./ai-ask-form";

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function aiMessageUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/ai?${searchParams.toString()}`;
}

function redirectAiResult(result: { error?: string; success?: string } | void, fallbackSuccess: string): never {
  if (result?.error) {
    redirect(aiMessageUrl({ error: result.error }));
  }
  redirect(aiMessageUrl({ success: result?.success ?? fallbackSuccess }));
}

type AiPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AiPage({ searchParams }: AiPageProps) {
  const pageParams = await searchParams;
  const actionError = firstParam(pageParams.error);
  const actionSuccess = firstParam(pageParams.success);
  const workspace = await getCurrentWorkspace();
  const [data, branches, permissions] = await Promise.all([
    getAiDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getAiPermissions(workspace.companyId),
  ]);
  const defaultBranchId = branches[0]?.id;
  const latestRequest = data.requests[0];
  const defaultDocument = data.documents[0];

  async function reportFromForm(formData: FormData) {
    "use server";

    const result = await createAiReportRequest(formData);
    redirectAiResult(result, "AI report request created.");
  }

  async function extractionFromForm(formData: FormData) {
    "use server";

    const result = await createAiExtractionRequest(formData);
    redirectAiResult(result, "AI extraction queued.");
  }

  async function approvalFromForm(formData: FormData) {
    "use server";

    const decision = formData.get("decision") === "rejected" ? "rejected" : "approved";
    const result = await decideAiApproval(formData);
    redirectAiResult(result, decision === "approved" ? "AI action approved." : "AI action rejected.");
  }

  return (
    <div className="space-y-6">
      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}
      {actionSuccess ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">AI Technical Intelligence</h2>
          <p className="text-sm text-slate-500">
            Permission-aware assistant for stock, leads, payments, documents, pricing, reports, and safe action drafts.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Conversations" value={String(data.stats.conversations)} hint="AI assistant threads" />
        <KpiCard title="Requests" value={String(data.stats.requests)} hint="Stored prompts and answers" />
        <KpiCard title="Tool actions" value={String(data.stats.actions)} hint="Executed/proposed tools" />
        <KpiCard title="Approvals" value={String(data.stats.pendingApprovals)} hint="Pending human decisions" />
        <KpiCard title="Reports" value={String(data.stats.reports)} hint="AI report requests" />
        <KpiCard title="Extractions" value={String(data.stats.extractions)} hint="Document extraction jobs" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ask AI</CardTitle>
              <CardDescription>Questions are answered through permission-aware server-side tools.</CardDescription>
            </CardHeader>
            <CardContent>
              {permissions.canUseAi ? (
                <AiAskForm companyId={workspace.companyId} branchId={defaultBranchId} />
              ) : (
                <p className="text-sm text-slate-500">Your role does not include AI assistant access.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest answer</CardTitle>
              <CardDescription>Direct answer, metric cards, related rows, and suggested next steps.</CardDescription>
            </CardHeader>
            <CardContent>
              {latestRequest ? (
                <div className="space-y-4">
                  <div className="rounded-md border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-950">{latestRequest.prompt}</p>
                        <p className="mt-1 text-sm text-slate-600">{latestRequest.answer_payload.directAnswer ?? latestRequest.response}</p>
                      </div>
                      <AiStatusBadge status={latestRequest.status} />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {(latestRequest.answer_payload.metrics ?? []).map((metric) => (
                      <div key={metric.label} className="rounded-md border p-3">
                        <p className="text-xs text-slate-500">{metric.label}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                  {(latestRequest.answer_payload.rows ?? []).length > 0 ? (
                    <div className="overflow-hidden rounded-md border">
                      <table className="w-full text-sm">
                        <tbody>
                          {(latestRequest.answer_payload.rows ?? []).slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-t first:border-t-0">
                              <td className="px-4 py-3 text-slate-600">{Object.entries(row).map(([key, value]) => `${key}: ${String(value)}`).join(" | ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Ask a question to create the first AI answer.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Conversation timeline</CardTitle>
                <CardDescription>Recent user and assistant messages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.messages.slice(0, 8).map((message) => (
                  <div key={message.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-orange-500" />
                      <p className="font-medium text-slate-950">{formatAiStatus(message.role)}</p>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{message.content}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(message.created_at)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tool log</CardTitle>
                <CardDescription>Auditable server-side AI tools and proposed actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.actions.slice(0, 8).map((action) => (
                  <div key={action.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{action.tool_name}</p>
                        <p className="text-xs text-slate-500">{action.action_number}</p>
                      </div>
                      <AiStatusBadge status={action.status} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {action.sensitive ? "Sensitive" : "Standard"} - {action.requires_approval ? "approval required" : "no approval required"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval queue</CardTitle>
              <CardDescription>Sensitive AI proposals wait here before humans take action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.approvals.slice(0, 8).map((approval) => (
                <div key={approval.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{approval.title}</p>
                      <p className="text-xs text-slate-500">{approval.approval_number}</p>
                    </div>
                    <AiStatusBadge status={approval.status} />
                  </div>
                  {approval.status === "pending" ? (
                    <form action={approvalFromForm} className="mt-3 flex gap-2">
                      <input type="hidden" name="approvalId" value={approval.id} />
                      <input type="hidden" name="notes" value="Reviewed in AI queue." />
                      <Button type="submit" name="decision" value="approved" size="sm" variant="outline">
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button type="submit" name="decision" value="rejected" size="sm" variant="outline">
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
              {data.approvals.length === 0 ? <p className="text-sm text-slate-500">No AI approvals yet.</p> : null}
            </CardContent>
          </Card>

          {permissions.canUseAi ? (
            <Card>
              <CardHeader>
                <CardTitle>Request report draft</CardTitle>
                <CardDescription>Queue an AI report request without exporting sensitive files.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={reportFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="reportType">Report type</Label>
                    <select id="reportType" name="reportType" defaultValue="inventory" className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="inventory">Inventory</option>
                      <option value="sales">Sales</option>
                      <option value="profit">Profit</option>
                      <option value="export">Export</option>
                      <option value="marketing">Marketing</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reportPrompt">Prompt</Label>
                    <Input id="reportPrompt" name="prompt" defaultValue="Generate an inventory report draft." required />
                  </div>
                  <Button type="submit" variant="outline">
                    <Bot className="h-4 w-4" />
                    Create report request
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canUseAi ? (
            <Card>
              <CardHeader>
                <CardTitle>Request document extraction</CardTitle>
                <CardDescription>Queue metadata extraction for a stored document.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={extractionFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="documentId">Document</Label>
                    <select id="documentId" name="documentId" defaultValue={defaultDocument?.id ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm">
                      <option value="">No source document</option>
                      {data.documents.map((document) => (
                        <option key={document.id} value={document.id}>{document.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="documentType">Document type</Label>
                    <Input id="documentType" name="documentType" defaultValue="vehicle_title" required />
                  </div>
                  <Button type="submit" variant="outline">
                    <FileSearch className="h-4 w-4" />
                    Queue extraction
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>AI work queues</CardTitle>
              <CardDescription>Report and extraction jobs saved for later automation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.reports.slice(0, 4).map((report) => (
                <div key={report.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{report.report_number}</p>
                      <p className="text-xs text-slate-500">{report.prompt}</p>
                    </div>
                    <AiStatusBadge status={report.status} />
                  </div>
                </div>
              ))}
              {data.extractions.slice(0, 4).map((extraction) => (
                <div key={extraction.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{extraction.extraction_number}</p>
                      <p className="text-xs text-slate-500">{extraction.document_type ?? "Document extraction"}</p>
                    </div>
                    <AiStatusBadge status={extraction.status} />
                  </div>
                </div>
              ))}
              {data.reports.length === 0 && data.extractions.length === 0 ? (
                <p className="text-sm text-slate-500">No AI work queue items yet.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety mode</CardTitle>
              <CardDescription>AI can draft and analyze, but sensitive actions require humans.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Finance and profit tools require permissions.</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Customer-facing messages are drafts only.</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Invoices, payments, and prices need approval.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
