"use client";

import { FormEvent, ReactNode, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquareText, Plus } from "lucide-react";
import { OperationsStatusBadge } from "@/components/operations/operations-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createChatMessage, createChatThread, createTaskFromChat } from "@/features/operations/actions";
import { formatOperationsStatus } from "@/lib/operations/format";
import { chatThreadTypes } from "@/lib/validations/operations";

type ChatMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: ChatMessage }) {
  if (!message) return null;

  return (
    <div
      className={
        message.type === "error"
          ? "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      }
    >
      {message.text}
    </div>
  );
}

function Field({ children }: { children: ReactNode }) {
  return <div className="grid gap-2">{children}</div>;
}

function useChatSubmit<T extends { error?: string; success?: string } | undefined>(
  action: (formData: FormData) => Promise<T>,
  fallbackSuccess: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<ChatMessage>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      const success = result?.success ?? fallbackSuccess;
      formRef.current?.reset();
      setMessage({ type: "success", text: success });
      router.replace(`${pathname}?success=${encodeURIComponent(success)}&updated=${Date.now()}`);
      router.refresh();
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

export function ChatThreadCreateForm({ branchId, companyId }: { branchId?: string; companyId: string }) {
  const { formRef, message, isPending, handleSubmit } = useChatSubmit(createChatThread, "Chat thread created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <Field>
        <Label htmlFor="threadTitle">Title</Label>
        <Input id="threadTitle" name="title" defaultValue="Sales and export coordination" required />
      </Field>
      <Field>
        <Label htmlFor="threadType">Type</Label>
        <select id="threadType" name="threadType" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="internal_support">
          {chatThreadTypes.map((type) => (
            <option key={type} value={type}>
              {formatOperationsStatus(type)}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" disabled={isPending}>
        <Plus className="h-4 w-4" />
        {isPending ? "Creating..." : "Create thread"}
      </Button>
    </form>
  );
}

export function ChatMessageCreateForm({
  branchId,
  companyId,
  threadId,
}: {
  branchId?: string;
  companyId: string;
  threadId: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useChatSubmit(createChatMessage, "Chat message sent.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <input type="hidden" name="threadId" value={threadId} />
      <Field>
        <Label htmlFor="messageBody">Message</Label>
        <textarea
          id="messageBody"
          name="body"
          rows={4}
          className="rounded-md border px-3 py-2 text-sm"
          defaultValue="Please review the export documents and customer balance before delivery."
          required
        />
      </Field>
      <Button type="submit" variant="outline" disabled={isPending}>
        <MessageSquareText className="h-4 w-4" />
        {isPending ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}

export function ChatTaskCreateForm({ branchId, companyId }: { branchId?: string; companyId: string }) {
  const { formRef, message, isPending, handleSubmit } = useChatSubmit(createTaskFromChat, "Task created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <input type="hidden" name="priority" value="medium" />
      <Field>
        <Label htmlFor="chatTaskTitle">Task title</Label>
        <Input id="chatTaskTitle" name="title" defaultValue="Follow up from chat" required />
      </Field>
      <Button type="submit" variant="outline" disabled={isPending}>
        <OperationsStatusBadge status="open" />
        {isPending ? "Creating..." : "Create chat task"}
      </Button>
    </form>
  );
}
