export type CrmLeadStatsInput = {
  status: string;
  lead_score: number;
  budget: number | null;
  next_follow_up_at: string | null;
};

export function formatCrmStatus(value: string) {
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function isFollowUpOverdue(
  dueAt: string | null,
  status: string,
  now = new Date(),
) {
  if (!dueAt || status !== "open") {
    return false;
  }

  return new Date(dueAt).getTime() < now.getTime();
}

export function isFollowUpDueToday(dueAt: string | null, now = new Date()) {
  if (!dueAt) {
    return false;
  }

  const due = new Date(dueAt);
  return (
    due.getFullYear() === now.getFullYear()
    && due.getMonth() === now.getMonth()
    && due.getDate() === now.getDate()
  );
}

export function getCrmStats(leads: CrmLeadStatsInput[], now = new Date()) {
  return {
    total: leads.length,
    hot: leads.filter((lead) => lead.lead_score >= 75 && lead.status !== "lost").length,
    dueToday: leads.filter((lead) => isFollowUpDueToday(lead.next_follow_up_at, now)).length,
    overdue: leads.filter((lead) => isFollowUpOverdue(lead.next_follow_up_at, "open", now)).length,
    pipelineValue: leads
      .filter((lead) => lead.status !== "lost")
      .reduce((sum, lead) => sum + Number(lead.budget ?? 0), 0),
  };
}
