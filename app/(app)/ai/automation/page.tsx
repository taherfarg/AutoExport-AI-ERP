import { Bot, ShieldAlert, Cpu, Sparkles, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAiAutomationAgents, getAiAutomationProposals } from "@/features/ai/queries";
import { getBranches } from "@/features/branches/queries";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { 
  AgentSwitchboard, 
  OcrDocumentIntake, 
  ProposalsApprovalFeed 
} from "./action-panels";

export const metadata = {
  title: "Advanced AI Automation - AutoSphere ERP",
  description: "Autonomous background agents, AI OCR Document Ingestion, and Manager Approval Console.",
};

export default async function AiAutomationPage() {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  // Secure path access by checking permissions
  const canView = permissions.has(PERMISSIONS.VIEW_AI_AUTOMATION);

  if (!canView) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 rounded-full border border-rose-200 bg-rose-50 p-4 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-950">Access Restricted</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          You do not have the required permissions (`view_ai_automation`) to view the Advanced AI Automation control board. Contact your system administrator for authorization.
        </p>
      </div>
    );
  }

  // Fetch company scoped tables
  const [agents, proposals, branches] = await Promise.all([
    getAiAutomationAgents(workspace.companyId),
    getAiAutomationProposals(workspace.companyId),
    getBranches(workspace.companyId)
  ]);

  const defaultBranchId = branches[0]?.id;
  const pendingProposalCount = proposals.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-7 pb-10">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-orange-500" />

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Advanced Intelligence
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Advanced AI Automation
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Control autonomous agents, OCR document intake, and approval-safe AI actions for CRM, parts procurement, and marketplace operations.
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[520px]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agents</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{agents.length}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Pending</p>
              <p className="mt-1 text-xl font-bold text-amber-900">{pendingProposalCount}</p>
            </div>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-700" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Approval Mode</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-indigo-950">Human checked</p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <Bot className="h-5 w-5 text-indigo-600" />
            Autonomous Background Agents
          </h2>
          <p className="mt-1 text-sm text-slate-600">Configure active intervals and trigger on-demand audits.</p>
        </div>
        <AgentSwitchboard 
          agents={agents} 
          defaultBranchId={defaultBranchId}
        />
      </section>

      <section className="space-y-4 pt-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <Cpu className="h-5 w-5 text-indigo-600" />
            Smart OCR Document Intake
          </h2>
          <p className="mt-1 text-sm text-slate-600">Transform invoice PDFs or title sheets into controlled draft records.</p>
        </div>
        <OcrDocumentIntake 
          companyId={workspace.companyId} 
          defaultBranchId={defaultBranchId}
        />
      </section>

      <section className="space-y-4 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Manager Approval Console
            </h2>
            <p className="mt-1 text-sm text-slate-600">Review drafted recommendations before any sensitive system update.</p>
          </div>
          <Badge className="w-fit border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
            {pendingProposalCount} Pending
          </Badge>
        </div>
        <ProposalsApprovalFeed proposals={proposals} />
      </section>
    </div>
  );
}
