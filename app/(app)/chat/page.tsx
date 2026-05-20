import { MessageSquareText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranches } from "@/features/branches/queries";
import { getChatDashboardData, getOperationsPermissions } from "@/features/operations/queries";
import { getCurrentWorkspace } from "@/lib/auth/current-workspace";
import { formatOperationsStatus } from "@/lib/operations/format";
import { buildChatPreview } from "@/lib/operations/reports";
import { ChatMessageCreateForm, ChatTaskCreateForm, ChatThreadCreateForm } from "./chat-action-forms";

export default async function ChatPage() {
  const workspace = await getCurrentWorkspace();
  const [data, branches, permissions] = await Promise.all([
    getChatDashboardData(workspace.companyId),
    getBranches(workspace.companyId),
    getOperationsPermissions(workspace.companyId),
  ]);
  const defaultBranchId = branches[0]?.id;
  const defaultThread = data.threads[0];

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
                <ChatThreadCreateForm branchId={defaultBranchId} companyId={workspace.companyId} />
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
                <ChatMessageCreateForm branchId={defaultBranchId} companyId={workspace.companyId} threadId={defaultThread.id} />
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
                <ChatTaskCreateForm branchId={defaultBranchId} companyId={workspace.companyId} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
