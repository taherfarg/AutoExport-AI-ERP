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
  const canManage = permissions.has(PERMISSIONS.MANAGE_AI_AUTOMATION);

  if (!canView) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center backdrop-blur-md">
        <div className="rounded-full bg-rose-500/10 p-4 border border-rose-500/20 text-rose-400 mb-4 animate-pulse">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Access Restricted</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
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

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-850 bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 p-6 md:p-8">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="h-3 w-3" />
                Advanced Intelligence
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-50 font-sans">
              Advanced AI Automation
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Supercharge business logic using self-executing AI agents and rapid OCR document indexing. AutoSphere CRM, parts procurement, and listing campaigns execute safely under manager approval.
            </p>
          </div>

          <div className="flex items-center gap-4 border border-slate-800 bg-slate-900/60 rounded-xl px-5 py-3.5 backdrop-blur-md">
            <Cpu className="h-8 w-8 text-indigo-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-300">Human-in-the-Loop Mode</p>
              <p className="text-slate-500 mt-0.5">Sensitive write operations require approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Agents Switchboard */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-400" />
            Autonomous Background Agents
          </h2>
          <p className="text-xs text-slate-400 mt-1">Configure active intervals and trigger on-demand audits</p>
        </div>
        <AgentSwitchboard 
          agents={agents} 
          companyId={workspace.companyId}
          defaultBranchId={defaultBranchId}
        />
      </section>

      {/* OCR Document Ingestion Control */}
      <section className="space-y-4 pt-2">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-400" />
            Smart OCR Document Intake
          </h2>
          <p className="text-xs text-slate-400 mt-1">Directly transform invoice PDFs or title sheets into vehicles or parts purchase orders</p>
        </div>
        <OcrDocumentIntake 
          companyId={workspace.companyId} 
          defaultBranchId={defaultBranchId}
        />
      </section>

      {/* Manager Approvals Feed */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-400" />
              Manager Approval Console
            </h2>
            <p className="text-xs text-slate-400 mt-1">Review drafted recommendations and verify justification before locking in updates</p>
          </div>
          <Badge className="border border-amber-500/20 bg-amber-500/10 text-amber-400 font-semibold px-2.5 py-0.5">
            {proposals.filter((p) => p.status === "pending").length} Pending
          </Badge>
        </div>
        <ProposalsApprovalFeed proposals={proposals} />
      </section>
    </div>
  );
}
