"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-lg space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-orange-600">Action failed</p>
        <h2 className="text-2xl font-semibold text-slate-950">This section could not load</h2>
        <p className="text-sm text-slate-600">
          The system stopped the request before changing data. Try again, or return to the previous screen.
        </p>
        {error.digest ? <p className="text-xs text-slate-400">Error reference: {error.digest}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
