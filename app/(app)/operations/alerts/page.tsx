import { Bell, Check, Clock, Plus, Siren } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OperationsStatusBadge } from "@/components/operations/operations-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranches } from "@/features/branches/queries";
import { createAlert, createReminder, createTask, markNotificationRead, updateAlertStatus } from "@/features/operations/actions";
import { getAlertsDashboardData, getOperationsPermissions } from "@/features/operations/queries";
import { getCompanyUsers } from "@/features/users/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatOperationsStatus } from "@/lib/operations/format";
import { alertPriorities, alertTypes } from "@/lib/validations/operations";

type CompanyUserRow = {
  profiles: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[] | null;
};

function profileFrom(row: CompanyUserRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

function dateTimeIn(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export default async function AlertsPage() {
  const workspace = await getCurrentWorkspace();
  const [data, branches, users, permissions] = await Promise.all([
    getAlertsDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getCompanyUsers(workspace.companyId),
    getOperationsPermissions(workspace.companyId),
  ]);
  const defaultBranchId = branches[0]?.id;
  const defaultAlert = data.alerts.find((alert) => alert.status !== "resolved") ?? data.alerts[0];
  const userOptions = (users as unknown as CompanyUserRow[]).map(profileFrom).filter(Boolean) as { id: string; full_name: string; email: string }[];

  async function alertFromForm(formData: FormData) {
    "use server";

    await createAlert(formData);
  }

  async function alertStatusFromForm(formData: FormData) {
    "use server";

    await updateAlertStatus(formData);
  }

  async function taskFromForm(formData: FormData) {
    "use server";

    await createTask(formData);
  }

  async function reminderFromForm(formData: FormData) {
    "use server";

    await createReminder(formData);
  }

  async function notificationFromForm(formData: FormData) {
    "use server";

    await markNotificationRead(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Smart Alerts</h2>
        <p className="text-sm text-slate-500">Operational alerts, tasks, reminders, and notification follow-up.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Open alerts" value={String(data.stats.openAlerts)} hint="Open or assigned alerts" />
        <KpiCard title="Critical" value={String(data.stats.criticalAlerts)} hint="Critical priority alerts" />
        <KpiCard title="Open tasks" value={String(data.stats.openTasks)} hint="Tasks still active" />
        <KpiCard title="Unread notices" value={String(data.stats.unreadNotifications)} hint="Notification center" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert queue</CardTitle>
              <CardDescription>Smart alerts linked to operational follow-up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-medium text-slate-950">{alert.title}</p>
                      <p className="text-xs text-slate-500">{alert.alert_number} - {formatOperationsStatus(alert.alert_type)}</p>
                      {alert.description ? <p className="mt-2 text-slate-600">{alert.description}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <OperationsStatusBadge status={alert.priority} />
                      <OperationsStatusBadge status={alert.status} />
                    </div>
                  </div>
                  {permissions.canManageAlerts && alert.status !== "resolved" ? (
                    <form action={alertStatusFromForm} className="mt-3 flex flex-wrap gap-2">
                      <input type="hidden" name="alertId" value={alert.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <input type="hidden" name="resolutionNotes" value="Resolved from smart alert queue." />
                      <Button type="submit" size="sm" variant="outline">
                        <Check className="h-4 w-4" />
                        Resolve alert
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task board</CardTitle>
              <CardDescription>Tasks assigned from alerts, chat, and operations follow-up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.tasks.map((task) => (
                <div key={task.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.task_number}</p>
                    </div>
                    <OperationsStatusBadge status={task.status} />
                  </div>
                  {task.description ? <p className="mt-2 text-slate-600">{task.description}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reminders</CardTitle>
              <CardDescription>Scheduled follow-ups for alert and task work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.reminders.map((reminder) => (
                <div key={reminder.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{reminder.title}</p>
                      <p className="text-xs text-slate-500">{reminder.reminder_number}</p>
                    </div>
                    <OperationsStatusBadge status={reminder.status} />
                  </div>
                  {reminder.description ? <p className="mt-2 text-slate-600">{reminder.description}</p> : null}
                </div>
              ))}
              {data.reminders.length === 0 ? <p className="text-sm text-slate-500">No reminders yet.</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {permissions.canManageAlerts ? (
            <Card>
              <CardHeader>
                <CardTitle>Create alert</CardTitle>
                <CardDescription>Add a manual smart alert for follow-up.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={alertFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="alertTitle">Title</Label>
                    <Input id="alertTitle" name="title" defaultValue="Payment follow-up required" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="alertType">Type</Label>
                    <select id="alertType" name="alertType" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="customer_payment_overdue">
                      {alertTypes.map((type) => <option key={type} value={type}>{formatOperationsStatus(type)}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <select id="priority" name="priority" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="high">
                      {alertPriorities.map((priority) => <option key={priority} value={priority}>{formatOperationsStatus(priority)}</option>)}
                    </select>
                  </div>
                  <Button type="submit">
                    <Siren className="h-4 w-4" />
                    Create alert
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageAlerts ? (
            <Card>
              <CardHeader>
                <CardTitle>Create task</CardTitle>
                <CardDescription>Assign a follow-up task from the alert queue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={taskFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <input type="hidden" name="alertId" value={defaultAlert?.id ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="taskTitle">Title</Label>
                    <Input id="taskTitle" name="title" defaultValue="Call customer about overdue payment" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assignedTo">Assignee</Label>
                    <select id="assignedTo" name="assignedTo" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue={workspace.profileId}>
                      {userOptions.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                    </select>
                  </div>
                  <input type="hidden" name="priority" value="medium" />
                  <Button type="submit" variant="outline">
                    <Plus className="h-4 w-4" />
                    Create task
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canManageAlerts ? (
            <Card>
              <CardHeader>
                <CardTitle>Create reminder</CardTitle>
                <CardDescription>Schedule an operational reminder.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={reminderFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="reminderTitle">Title</Label>
                    <Input id="reminderTitle" name="title" defaultValue="Review alert queue" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="remindAt">Remind at</Label>
                    <Input id="remindAt" type="datetime-local" name="remindAt" defaultValue={dateTimeIn(4)} required />
                  </div>
                  <Button type="submit" variant="outline">
                    <Clock className="h-4 w-4" />
                    Create reminder
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Tenant notification center.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.notifications.map((notification) => (
                <div key={notification.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{notification.title}</p>
                      <p className="text-xs text-slate-500">{notification.body}</p>
                    </div>
                    <Bell className="h-4 w-4 text-orange-500" />
                  </div>
                  {!notification.read_at ? (
                    <form action={notificationFromForm} className="mt-3">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <Button type="submit" size="sm" variant="outline">Mark read</Button>
                    </form>
                  ) : null}
                </div>
              ))}
              {data.notifications.length === 0 ? <p className="text-sm text-slate-500">No notifications yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
