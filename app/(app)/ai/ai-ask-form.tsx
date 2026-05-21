"use client";

import { FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { askAiAssistant } from "@/features/ai/actions";

type AiAskFormProps = {
  branchId?: string;
  companyId: string;
};

export function AiAskForm({ branchId, companyId }: AiAskFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(undefined);

    startTransition(async () => {
      let result;
      try {
        result = await askAiAssistant(formData);
      } catch {
        setError("AI request could not be completed. Please refresh and try again.");
        return;
      }

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.replace(`${pathname}?ai=${Date.now()}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <div className="grid gap-2">
        <Label htmlFor="prompt">Question</Label>
        <textarea
          id="prompt"
          name="prompt"
          rows={4}
          className="rounded-md border px-3 py-2 text-sm"
          defaultValue="How many cars are available?"
          required
        />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        {[
          "Which Toyota cars are available?",
          "Which leads need follow-up today?",
          "Show pending customer payments.",
          "What documents are missing?",
          "Create social media caption for this vehicle.",
        ].map((example) => (
          <span key={example} className="rounded-full border bg-slate-50 px-2 py-1">{example}</span>
        ))}
      </div>
      <Button type="submit" disabled={isPending}>
        <Sparkles className="h-4 w-4" />
        {isPending ? "Asking..." : "Ask AI"}
      </Button>
    </form>
  );
}
