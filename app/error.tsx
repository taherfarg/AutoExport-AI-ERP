"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="max-w-md space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm font-medium uppercase tracking-wide text-orange-300">System error</p>
            <h1 className="text-2xl font-semibold">This page could not load</h1>
            <p className="text-sm text-slate-300">
              The action failed safely. Try again, or go back to the previous page.
            </p>
            {error.digest ? <p className="text-xs text-slate-500">Error reference: {error.digest}</p> : null}
            <div className="flex gap-2">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Go back
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
