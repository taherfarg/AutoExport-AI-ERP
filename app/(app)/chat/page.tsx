import { MessageSquareText, Plus } from "lucide-react";
import { OperationsStatusBadge } from "@/components/operations/operations-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranches } from "@/features/branches/queries";
import { createChatMessage, createChatThread, createTaskFromChat } from "@/features/operations/actions";
import { getChatDashboardData, getOperationsPermissions } from "@/features/operations/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatOperationsStatus } from "@/lib/operations/format";
import { buildChatPreview } from "@/lib/operations/reports";
import { chatThreadTypes } from "@/lib/validations/operations";

export default async function ChatPage() {
  const workspace = await getCurrentWorkspace();
  const [data, branches, permissions] = await Promise.all([
    getChatDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getOperationsPermissions(workspace.companyId),
  ]);
  const defaultBranchId = branches[0]?.id;
  const defaultThread = data.threads[0];

  async function threadFromForm(formData: FormData) {
    "use server";

    await createChatThread(formData);
  }

  async function messageFromForm(formData: FormData) {
    "use server";

    await createChatMessage(formData);
  }

  async function taskFromForm(formData: FormData) {
    "use server";

    await createTaskFromChat(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Chat Center</h2>
        <p className="text-sm text-slate-500">Team, branch, vehicle, customer, export, support, and AI conversations.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          {permissions.canUseChat ? (
            <Card>
              <CardHeader>
                <CardTitle>Create thread</CardTitle>
                <CardDescription>Start a tenant-secure internal conversation.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={threadFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <div className="grid gap-2">
                    <Label htmlFor="threadTitle">Title</Label>
                    <Input id="threadTitle" name="title" defaultValue="Sales and export coordination" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="threadType">Type</Label>
                    <select id="threadType" name="threadType" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="internal_support">
                      {chatThreadTypes.map((type) => <option key={type} value={type}>{formatOperationsStatus(type)}</option>)}
                    </select>
                  </div>
                  <Button type="submit">
                    <Plus className="h-4 w-4" />
                    Create thread
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Threads</CardTitle>
              <CardDescription>Recent conversations you participate in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.threads.map((thread) => (
                <div key={thread.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium text-slate-950">{thread.title}</p>
                  <p className="text-xs text-slate-500">{thread.thread_number} - {formatOperationsStatus(thread.thread_type)}</p>
                </div>
              ))}
              {data.threads.length === 0 ? <p className="text-sm text-slate-500">No chat threads yet.</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Latest chat activity across your visible threads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.messages.map((message) => (
                <div key={message.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start gap-3">
                    <MessageSquareText className="mt-0.5 h-4 w-4 text-orange-500" />
                    <div>
                      <p className="font-medium text-slate-950">{message.profiles?.full_name ?? "Team member"}</p>
                      <p className="text-slate-600">{buildChatPreview(message.body, 120)}</p>
                      <p className="mt-1 text-xs text-slate-500">{message.message_number}</p>
                    </div>
                  </div>
                </div>
              ))}
              {data.messages.length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
            </CardContent>
          </Card>

          {permissions.canUseChat && defaultThread ? (
            <Card>
              <CardHeader>
                <CardTitle>Send message</CardTitle>
                <CardDescription>Add a message to the latest thread.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={messageFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <input type="hidden" name="threadId" value={defaultThread.id} />
                  <div className="grid gap-2">
                    <Label htmlFor="messageBody">Message</Label>
                    <textarea id="messageBody" name="body" rows={4} className="rounded-md border px-3 py-2 text-sm" defaultValue="Please review the export documents and customer balance before delivery." required />
                  </div>
                  <Button type="submit" variant="outline">
                    <MessageSquareText className="h-4 w-4" />
                    Send message
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {permissions.canUseChat ? (
            <Card>
              <CardHeader>
                <CardTitle>Create task from chat</CardTitle>
                <CardDescription>Turn a conversation item into a tracked operations task.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={taskFromForm} className="grid gap-3">
                  <input type="hidden" name="companyId" value={workspace.companyId} />
                  <input type="hidden" name="branchId" value={defaultBranchId ?? ""} />
                  <input type="hidden" name="priority" value="medium" />
                  <div className="grid gap-2">
                    <Label htmlFor="chatTaskTitle">Task title</Label>
                    <Input id="chatTaskTitle" name="title" defaultValue="Follow up from chat" required />
                  </div>
                  <Button type="submit" variant="outline">
                    <OperationsStatusBadge status="open" />
                    Create chat task
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
