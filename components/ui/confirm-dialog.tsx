"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  action: (formData: FormData) => Promise<{ error?: string; success?: string } | void>;
  hiddenFields?: Record<string, string>;
  children: React.ReactNode;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  action,
  hiddenFields,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">{description}</p>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <form
              ref={formRef}
              action={async (formData) => {
                setPending(true);
                setError(null);
                try {
                  const result = await action(formData);
                  if (result && "error" in result && result.error) {
                    setError(result.error);
                  } else {
                    setOpen(false);
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : "An unexpected error occurred.");
                } finally {
                  setPending(false);
                }
              }}
              className="mt-5 flex items-center justify-end gap-3"
            >
              {hiddenFields &&
                Object.entries(hiddenFields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" variant={variant} disabled={pending}>
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing…
                  </span>
                ) : (
                  confirmLabel
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
