"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentPermissionSet, getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createAlertSchema,
  createChatMessageSchema,
  createChatThreadSchema,
  createReminderSchema,
  createReportExportSchema,
  createReportScheduleSchema,
  createTaskSchema,
  markNotificationReadSchema,
  updateAlertSchema,
} from "@/lib/validations/operations";

function formOptional(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function formArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function requirePermission(permissionKey: string) {
  const workspace = await getCurrentWorkspace();
  const permissions = await getCurrentPermissionSet(workspace.companyId);

  if (!permissions.has(permissionKey)) {
    throw new Error("You do not have permission for this operation.");
  }

  return workspace;
}

async function writeAuditLog({
  companyId,
  branchId,
  actorProfileId,
  action,
  entityType,
  entityId,
  newValues,
}: {
  companyId: string;
  branchId?: string | null;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  newValues?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    branch_id: branchId,
    actor_profile_id: actorProfileId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    severity: "info",
    new_values: newValues ?? null,
  });
}

export async function createReportExport(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_REPORTS);
  const parsed = createReportExportSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    savedReportId: formOptional(formData.get("savedReportId")),
    reportType: formData.get("reportType"),
    exportFormat: formData.get("exportFormat"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Report export details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("report_exports")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      saved_report_id: parsed.data.savedReportId,
      export_number: parsed.data.exportNumber,
      report_type: parsed.data.reportType,
      export_format: parsed.data.exportFormat,
      status: "completed",
      result_summary: `${parsed.data.reportType} ${parsed.data.exportFormat.toUpperCase()} export request saved.`,
      requested_by: workspace.profileId,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Report export could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_report_export",
    entityType: "report_export",
    entityId: data.id,
    newValues: { reportType: parsed.data.reportType, exportFormat: parsed.data.exportFormat },
  });

  revalidatePath("/reports");
  return { reportExportId: data.id, success: "Report export created." };
}

export async function createReportSchedule(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_REPORTS);
  const parsed = createReportScheduleSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    savedReportId: formData.get("savedReportId"),
    name: formData.get("name"),
    frequency: formData.get("frequency"),
    runTime: formData.get("runTime"),
    recipients: formArray(formData.get("recipients")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Report schedule details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("report_schedules")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      saved_report_id: parsed.data.savedReportId,
      schedule_number: parsed.data.scheduleNumber,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      run_time: parsed.data.runTime,
      timezone: parsed.data.timezone,
      recipients: parsed.data.recipients,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Report schedule could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_report_schedule",
    entityType: "report_schedule",
    entityId: data.id,
    newValues: { frequency: parsed.data.frequency },
  });

  revalidatePath("/reports");
  return { reportScheduleId: data.id, success: "Report schedule created." };
}

export async function createAlert(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_ALERTS);
  const parsed = createAlertSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    alertType: formData.get("alertType"),
    title: formData.get("title"),
    description: formOptional(formData.get("description")),
    priority: formData.get("priority"),
    assignedTo: formOptional(formData.get("assignedTo")),
    dueAt: formOptional(formData.get("dueAt")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Alert details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      alert_number: parsed.data.alertNumber,
      alert_type: parsed.data.alertType,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      assigned_to: parsed.data.assignedTo,
      due_at: parsed.data.dueAt,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Alert could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_alert",
    entityType: "alert",
    entityId: data.id,
    newValues: { title: parsed.data.title, priority: parsed.data.priority },
  });

  revalidatePath("/operations/alerts");
  return { alertId: data.id, success: "Alert created." };
}

export async function updateAlertStatus(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_ALERTS);
  const parsed = updateAlertSchema.safeParse({
    alertId: formData.get("alertId"),
    status: formData.get("status"),
    resolutionNotes: formOptional(formData.get("resolutionNotes")),
    snoozedUntil: formOptional(formData.get("snoozedUntil")),
  });

  if (!parsed.success) {
    return { error: "Alert update is invalid." };
  }

  const supabase = createServiceRoleClient();
  const updateValues = {
    status: parsed.data.status,
    resolution_notes: parsed.data.resolutionNotes,
    snoozed_until: parsed.data.snoozedUntil,
    resolved_by: parsed.data.status === "resolved" ? workspace.profileId : null,
    resolved_at: parsed.data.status === "resolved" ? new Date().toISOString() : null,
    updated_by: workspace.profileId,
  };
  const { data, error } = await supabase
    .from("alerts")
    .update(updateValues)
    .eq("company_id", workspace.companyId)
    .eq("id", parsed.data.alertId)
    .select("id, branch_id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Alert could not be updated." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: data.branch_id,
    actorProfileId: workspace.profileId,
    action: "update_alert_status",
    entityType: "alert",
    entityId: data.id,
    newValues: updateValues,
  });

  revalidatePath("/operations/alerts");
  return { alertId: data.id, success: "Alert updated." };
}

export async function createTask(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_ALERTS);
  const parsed = createTaskSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    alertId: formOptional(formData.get("alertId")),
    title: formData.get("title"),
    description: formOptional(formData.get("description")),
    priority: formData.get("priority"),
    assignedTo: formOptional(formData.get("assignedTo")),
    dueAt: formOptional(formData.get("dueAt")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Task details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      alert_id: parsed.data.alertId,
      task_number: parsed.data.taskNumber,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      assigned_to: parsed.data.assignedTo,
      due_at: parsed.data.dueAt,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Task could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_task",
    entityType: "task",
    entityId: data.id,
    newValues: { title: parsed.data.title, priority: parsed.data.priority },
  });

  revalidatePath("/operations/alerts");
  return { taskId: data.id, success: "Task created." };
}

export async function createReminder(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_ALERTS);
  const parsed = createReminderSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    title: formData.get("title"),
    description: formOptional(formData.get("description")),
    remindAt: formData.get("remindAt"),
    assignedTo: formOptional(formData.get("assignedTo")),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Reminder details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      reminder_number: parsed.data.reminderNumber,
      title: parsed.data.title,
      description: parsed.data.description,
      remind_at: parsed.data.remindAt,
      assigned_to: parsed.data.assignedTo,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Reminder could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_reminder",
    entityType: "reminder",
    entityId: data.id,
    newValues: { title: parsed.data.title },
  });

  revalidatePath("/operations/alerts");
  return { reminderId: data.id, success: "Reminder created." };
}

export async function createChatThread(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.USE_CHAT);
  const parsed = createChatThreadSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    threadType: formData.get("threadType"),
    title: formData.get("title"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Chat thread details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      thread_number: parsed.data.threadNumber,
      thread_type: parsed.data.threadType,
      title: parsed.data.title,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Chat thread could not be created." };
  }

  await supabase.from("chat_participants").insert({
    company_id: workspace.companyId,
    thread_id: data.id,
    profile_id: workspace.profileId,
  });

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_chat_thread",
    entityType: "chat_thread",
    entityId: data.id,
    newValues: { title: parsed.data.title },
  });

  revalidatePath("/chat");
  return { threadId: data.id, success: "Chat thread created." };
}

export async function createChatMessage(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.USE_CHAT);
  const parsed = createChatMessageSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    threadId: formData.get("threadId"),
    body: formData.get("body"),
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Chat message details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      thread_id: parsed.data.threadId,
      message_number: parsed.data.messageNumber,
      body: parsed.data.body,
      created_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Chat message could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_chat_message",
    entityType: "chat_message",
    entityId: data.id,
    newValues: { threadId: parsed.data.threadId },
  });

  revalidatePath("/chat");
  return { messageId: data.id, success: "Chat message sent." };
}

export async function createTaskFromChat(formData: FormData) {
  const workspace = await requirePermission(PERMISSIONS.MANAGE_ALERTS);
  const parsed = createTaskSchema.safeParse({
    companyId: formData.get("companyId"),
    branchId: formOptional(formData.get("branchId")),
    title: formData.get("title"),
    description: formOptional(formData.get("description")),
    priority: formData.get("priority") ?? "medium",
  });

  if (!parsed.success || parsed.data.companyId !== workspace.companyId) {
    return { error: "Chat task details are invalid." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: workspace.companyId,
      branch_id: parsed.data.branchId,
      task_number: parsed.data.taskNumber,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      assigned_to: workspace.profileId,
      created_by: workspace.profileId,
      updated_by: workspace.profileId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Chat task could not be created." };
  }

  await writeAuditLog({
    companyId: workspace.companyId,
    branchId: parsed.data.branchId,
    actorProfileId: workspace.profileId,
    action: "create_task_from_chat",
    entityType: "task",
    entityId: data.id,
    newValues: { title: parsed.data.title },
  });

  revalidatePath("/chat");
  revalidatePath("/operations/alerts");
  redirect("/operations/alerts");
}

export async function markNotificationRead(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const parsed = markNotificationReadSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });

  if (!parsed.success) {
    return { error: "Notification details are invalid." };
  }

  const supabase = createServiceRoleClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.notificationId)
    .eq("company_id", workspace.companyId)
    .eq("profile_id", workspace.profileId);

  revalidatePath("/operations/alerts");
}
