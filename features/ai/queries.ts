import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

export type AiPermissions = {
  canUseAi: boolean;
};

export type AiConversationRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export type AiMessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AiRequestRow = {
  id: string;
  request_number: string;
  prompt: string;
  response: string | null;
  answer_payload: {
    directAnswer?: string;
    metrics?: { label: string; value: string }[];
    rows?: Record<string, unknown>[];
    suggestedActions?: string[];
  };
  provider: string;
  model: string | null;
  status: string;
  created_at: string;
};

export type AiActionRow = {
  id: string;
  action_number: string;
  tool_name: string;
  action_type: string;
  status: string;
  sensitive: boolean;
  requires_approval: boolean;
  output_payload: Record<string, unknown>;
  created_at: string;
};

export type AiApprovalRow = {
  id: string;
  approval_number: string;
  title: string;
  status: string;
  requested_at: string;
  decided_at: string | null;
  decision_notes: string | null;
  payload: Record<string, unknown>;
  ai_actions: { tool_name: string; action_number: string } | null;
};

export type AiExtractionRow = {
  id: string;
  extraction_number: string;
  document_type: string | null;
  status: string;
  confidence: number | null;
  created_at: string;
  documents: { title: string; document_number: string } | null;
};

export type AiReportRequestRow = {
  id: string;
  report_number: string;
  report_type: string;
  prompt: string;
  status: string;
  result_summary: string | null;
  created_at: string;
};

export type AiDocumentOption = {
  id: string;
  title: string;
  document_number: string;
};

export async function getAiPermissions(companyId: string): Promise<AiPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canUseAi: permissions.has(PERMISSIONS.USE_AI_ASSISTANT),
  };
}

export async function getAiDashboardData(companyId: string) {
  const supabase = await createClient();
  const [
    conversationsResult,
    messagesResult,
    requestsResult,
    actionsResult,
    approvalsResult,
    extractionResult,
    reportsResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("id, title, status, created_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, payload, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_requests")
      .select("id, request_number, prompt, response, answer_payload, provider, model, status, created_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_actions")
      .select("id, action_number, tool_name, action_type, status, sensitive, requires_approval, output_payload, created_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("ai_approvals")
      .select("id, approval_number, title, status, requested_at, decided_at, decision_notes, payload, ai_actions(tool_name, action_number)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("requested_at", { ascending: false })
      .limit(30),
    supabase
      .from("ai_extracted_documents")
      .select("id, extraction_number, document_type, status, confidence, created_at, documents(title, document_number)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_report_requests")
      .select("id, report_number, report_type, prompt, status, result_summary, created_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("documents")
      .select("id, title, document_number")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  for (const result of [
    conversationsResult,
    messagesResult,
    requestsResult,
    actionsResult,
    approvalsResult,
    extractionResult,
    reportsResult,
    documentsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const approvals = (approvalsResult.data ?? []) as unknown as AiApprovalRow[];

  return {
    conversations: (conversationsResult.data ?? []) as AiConversationRow[],
    messages: (messagesResult.data ?? []) as AiMessageRow[],
    requests: (requestsResult.data ?? []) as unknown as AiRequestRow[],
    actions: (actionsResult.data ?? []) as AiActionRow[],
    approvals,
    extractions: (extractionResult.data ?? []) as unknown as AiExtractionRow[],
    reports: (reportsResult.data ?? []) as AiReportRequestRow[],
    documents: (documentsResult.data ?? []) as AiDocumentOption[],
    stats: {
      conversations: conversationsResult.data?.length ?? 0,
      requests: requestsResult.data?.length ?? 0,
      actions: actionsResult.data?.length ?? 0,
      pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
      reports: reportsResult.data?.length ?? 0,
      extractions: extractionResult.data?.length ?? 0,
    },
  };
}
