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

export type AiAutomationAgentRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  agent_type: "crm_follow_up" | "parts_reorder" | "vehicle_marketing";
  is_enabled: boolean;
  status: "idle" | "scanning" | "error";
  config: Record<string, unknown>;
  last_scan_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type AiDocumentExtractionRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  document_type: string;
  status: "pending" | "completed" | "failed";
  extracted_data: Record<string, unknown>;
  raw_text: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type AiAutomationProposalRow = {
  id: string;
  company_id: string;
  branch_id: string | null;
  agent_id: string | null;
  proposal_type: "lead_follow_up" | "parts_reorder" | "vehicle_marketing";
  title: string;
  description: string;
  justification: string;
  proposed_payload: Record<string, unknown>;
  status: "pending" | "approved" | "dismissed" | "failed";
  resolved_by: string | null;
  resolved_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAiAutomationAgents(companyId: string): Promise<AiAutomationAgentRow[]> {
  const supabase = await createClient();
  const { data: agentData, error } = await supabase
    .from("ai_automation_agents")
    .select("*")
    .eq("company_id", companyId)
    .order("agent_type", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  let data = agentData;

  if (!data || data.length === 0) {
    const defaultAgents = [
      { company_id: companyId, agent_type: "crm_follow_up", is_enabled: false, status: "idle", config: {} },
      { company_id: companyId, agent_type: "parts_reorder", is_enabled: false, status: "idle", config: {} },
      { company_id: companyId, agent_type: "vehicle_marketing", is_enabled: false, status: "idle", config: {} },
    ];
    const { data: insertedData, error: insertError } = await supabase
      .from("ai_automation_agents")
      .insert(defaultAgents)
      .select();

    if (insertError) {
      console.error("Failed to seed default AI automation agents:", insertError.message);
    } else if (insertedData) {
      data = insertedData;
    }
  }

  return (data ?? []) as unknown as AiAutomationAgentRow[];
}

export async function getAiDocumentExtractions(companyId: string): Promise<AiDocumentExtractionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_document_extractions")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as AiDocumentExtractionRow[];
}

export async function getAiAutomationProposals(companyId: string): Promise<AiAutomationProposalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_automation_proposals")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as AiAutomationProposalRow[];
}
