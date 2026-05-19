import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md space-y-4 rounded-xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-orange-600">Not found</p>
        <h1 className="text-2xl font-semibold text-slate-950">This page does not exist</h1>
        <p className="text-sm text-slate-600">
          The record may have been moved, archived, or you may not have access.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
