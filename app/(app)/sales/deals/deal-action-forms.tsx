"use client";

import { FormEvent, ReactNode, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type DealActionResult = {
  success?: string;
  error?: string;
};

type Message = {
  type: "success" | "error";
  text: string;
};

function Feedback({ message }: { message?: Message }) {
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

export function DealActionForm({
  action,
  children,
  buttonLabel,
  pendingLabel = "Saving...",
  className = "grid gap-4 md:grid-cols-4",
}: {
  action: (formData: FormData) => Promise<DealActionResult>;
  children: ReactNode;
  buttonLabel: string;
  pendingLabel?: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<Message>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      const notice = result.success ?? "Saved.";
      setMessage({ type: "success", text: notice });
      formRef.current?.reset();
      window.location.assign(`/sales/deals?notice=${encodeURIComponent(notice)}&deal=${Date.now()}`);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={className}>
      <div className="md:col-span-4">
        <Feedback message={message} />
      </div>
      {children}
      <div className="flex items-end md:col-span-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : buttonLabel}
        </Button>
      </div>
    </form>
  );
}
