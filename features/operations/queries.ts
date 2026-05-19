import { getCurrentPermissionSet } from "@/lib/auth/current-workspace";
import { calculateOperationsReportSummary } from "@/lib/operations/reports";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createClient } from "@/lib/supabase/server";

export type OperationsPermissions = {
  canViewReports: boolean;
  canManageReports: boolean;
  canViewAlerts: boolean;
  canManageAlerts: boolean;
  canUseChat: boolean;
  canViewAuditLogs: boolean;
};

export type SavedReportRow = {
  id: string;
  report_number: string;
  name: string;
  report_type: string;
  description: string | null;
  created_at: string;
};

export type ReportExportRow = {
  id: string;
  export_number: string;
  report_type: string;
  export_format: string;
  status: string;
  result_summary: string | null;
  created_at: string;
};

export type ReportScheduleRow = {
  id: string;
  schedule_number: string;
  name: string;
  frequency: string;
  run_time: string;
  recipients: string[];
  active: boolean;
};

export type AlertRow = {
  id: string;
  alert_number: string;
  alert_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  created_at: string;
};

export type TaskRow = {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_at: string | null;
  alerts: { title: string; alert_number: string } | null;
};

export type ReminderRow = {
  id: string;
  reminder_number: string;
  title: string;
  description: string | null;
  status: string;
  remind_at: string;
  assigned_to: string | null;
};

export type ChatThreadRow = {
  id: string;
  thread_number: string;
  thread_type: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  message_number: string;
  message_type: string;
  body: string;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  read_at: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  severity: string;
  new_values: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; email: string } | null;
};

export async function getOperationsPermissions(companyId: string): Promise<OperationsPermissions> {
  const permissions = await getCurrentPermissionSet(companyId);

  return {
    canViewReports: permissions.has(PERMISSIONS.VIEW_REPORTS),
    canManageReports: permissions.has(PERMISSIONS.MANAGE_REPORTS),
    canViewAlerts: permissions.has(PERMISSIONS.VIEW_ALERTS),
    canManageAlerts: permissions.has(PERMISSIONS.MANAGE_ALERTS),
    canUseChat: permissions.has(PERMISSIONS.USE_CHAT),
    canViewAuditLogs: permissions.has(PERMISSIONS.VIEW_AUDIT_LOGS),
  };
}

export async function getReportsDashboardData(companyId: string) {
  const supabase = await createClient();
  const [vehiclesResult, invoicesResult, exportsResult, leadsResult, campaignsResult, reportsResult, exportsRowsResult, schedulesResult] = await Promise.all([
    supabase.from("vehicles").select("status, selling_price, total_landed_cost, branches(name)").eq("company_id", companyId).is("deleted_at", null),
    supabase.from("sales_invoices").select("total, paid_amount, balance_due").eq("company_id", companyId).is("deleted_at", null),
    supabase.from("export_orders").select("status").eq("company_id", companyId).is("deleted_at", null),
    supabase.from("leads").select("status, lead_source").eq("company_id", companyId).is("deleted_at", null),
    supabase.from("campaigns").select("spend, leads").eq("company_id", companyId).is("deleted_at", null),
    supabase.from("saved_reports").select("id, report_number, name, report_type, description, created_at").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("report_exports").select("id, export_number, report_type, export_format, status, result_summary, created_at").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
    supabase.from("report_schedules").select("id, schedule_number, name, frequency, run_time, recipients, active").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
  ]);

  for (const result of [vehiclesResult, invoicesResult, exportsResult, leadsResult, campaignsResult, reportsResult, exportsRowsResult, schedulesResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const vehicles = ((vehiclesResult.data ?? []) as unknown as { status: string; selling_price: number; total_landed_cost: number; branches: { name: string } | null }[]).map((vehicle) => ({
    status: vehicle.status,
    sellingPrice: Number(vehicle.selling_price),
    totalLandedCost: Number(vehicle.total_landed_cost),
    branchName: vehicle.branches?.name ?? "Unassigned",
  }));
  const invoices = ((invoicesResult.data ?? []) as { total: number; paid_amount: number; balance_due: number }[]).map((invoice) => ({
    total: Number(invoice.total),
    paidAmount: Number(invoice.paid_amount),
    balanceDue: Number(invoice.balance_due),
  }));
  const exportOrders = ((exportsResult.data ?? []) as { status: string }[]).map((row) => ({ status: row.status }));
  const leads = ((leadsResult.data ?? []) as { status: string; lead_source: string | null }[]).map((lead) => ({ status: lead.status, source: lead.lead_source }));
  const campaigns = ((campaignsResult.data ?? []) as { spend: number; leads: number }[]).map((campaign) => ({ spend: Number(campaign.spend), leads: Number(campaign.leads) }));

  return {
    summary: calculateOperationsReportSummary({ vehicles, invoices, exportOrders, leads, campaigns }),
    savedReports: (reportsResult.data ?? []) as SavedReportRow[],
    reportExports: (exportsRowsResult.data ?? []) as ReportExportRow[],
    reportSchedules: (schedulesResult.data ?? []) as ReportScheduleRow[],
  };
}

export async function getAlertsDashboardData(companyId: string) {
  const supabase = await createClient();
  const [alertsResult, tasksResult, remindersResult, notificationsResult] = await Promise.all([
    supabase.from("alerts").select("id, alert_number, alert_type, title, description, priority, status, due_at, assigned_to, resolution_notes, created_at").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, task_number, title, description, status, priority, assigned_to, due_at, alerts(title, alert_number)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("reminders").select("id, reminder_number, title, description, status, remind_at, assigned_to").eq("company_id", companyId).is("deleted_at", null).order("remind_at", { ascending: true }),
    supabase.from("notifications").select("id, title, body, notification_type, read_at, created_at").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }).limit(20),
  ]);

  for (const result of [alertsResult, tasksResult, remindersResult, notificationsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const alerts = (alertsResult.data ?? []) as AlertRow[];
  const tasks = (tasksResult.data ?? []) as unknown as TaskRow[];
  const reminders = (remindersResult.data ?? []) as ReminderRow[];
  const notifications = (notificationsResult.data ?? []) as NotificationRow[];

  return {
    alerts,
    tasks,
    reminders,
    notifications,
    stats: {
      openAlerts: alerts.filter((alert) => alert.status === "open" || alert.status === "assigned").length,
      criticalAlerts: alerts.filter((alert) => alert.priority === "critical").length,
      openTasks: tasks.filter((task) => task.status === "open" || task.status === "in_progress").length,
      unreadNotifications: notifications.filter((notification) => !notification.read_at).length,
    },
  };
}

export async function getChatDashboardData(companyId: string) {
  const supabase = await createClient();
  const [threadsResult, messagesResult] = await Promise.all([
    supabase.from("chat_threads").select("id, thread_number, thread_type, title, last_message_at, created_at").eq("company_id", companyId).is("deleted_at", null).order("last_message_at", { ascending: false, nullsFirst: false }).limit(20),
    supabase.from("chat_messages").select("id, thread_id, message_number, message_type, body, created_at, profiles!chat_messages_created_by_fkey(full_name, email)").eq("company_id", companyId).is("deleted_at", null).order("created_at", { ascending: false }).limit(40),
  ]);

  for (const result of [threadsResult, messagesResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return {
    threads: (threadsResult.data ?? []) as ChatThreadRow[],
    messages: (messagesResult.data ?? []) as unknown as ChatMessageRow[],
  };
}

export async function getAuditLogData(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, severity, new_values, created_at, actor:profiles!audit_logs_actor_profile_id_fkey(full_name, email)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as AuditLogRow[];
}
