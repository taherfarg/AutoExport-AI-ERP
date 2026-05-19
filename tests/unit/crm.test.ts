import { describe, expect, test } from "vitest";
import {
  formatCrmStatus,
  getCrmStats,
  isFollowUpOverdue,
  type CrmLeadStatsInput,
} from "@/lib/crm/format";

describe("CRM formatting", () => {
  test("formats CRM enum values for human-readable badges", () => {
    expect(formatCrmStatus("quotation_sent")).toBe("Quotation sent");
    expect(formatCrmStatus("export_inquiry")).toBe("Export inquiry");
  });

  test("detects only open follow-ups past their due time as overdue", () => {
    const now = new Date("2026-05-19T10:00:00.000Z");

    expect(isFollowUpOverdue("2026-05-19T09:59:00.000Z", "open", now)).toBe(true);
    expect(isFollowUpOverdue("2026-05-19T09:59:00.000Z", "completed", now)).toBe(false);
    expect(isFollowUpOverdue("2026-05-19T10:01:00.000Z", "open", now)).toBe(false);
  });

  test("summarizes lead KPIs from visible CRM rows", () => {
    const leads: CrmLeadStatsInput[] = [
      {
        status: "new",
        lead_score: 82,
        budget: 100000,
        next_follow_up_at: "2026-05-19T09:00:00.000Z",
      },
      {
        status: "won",
        lead_score: 91,
        budget: 150000,
        next_follow_up_at: "2026-05-19T14:00:00.000Z",
      },
      {
        status: "lost",
        lead_score: 44,
        budget: null,
        next_follow_up_at: "2026-05-20T09:00:00.000Z",
      },
    ];

    expect(getCrmStats(leads, new Date("2026-05-19T10:00:00.000Z"))).toEqual({
      total: 3,
      hot: 2,
      dueToday: 2,
      overdue: 1,
      pipelineValue: 250000,
    });
  });
});

