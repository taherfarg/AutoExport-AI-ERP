export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500" />
        <p className="text-sm font-medium text-slate-600">Loading AutoSphere ERP...</p>
      </div>
    </main>
  );
}
