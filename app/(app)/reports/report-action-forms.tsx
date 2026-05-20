"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReportExport, createReportSchedule } from "@/features/operations/actions";
import { formatOperationsStatus } from "@/lib/operations/format";
import { reportExportFormats, reportScheduleFrequencies, reportTypes } from "@/lib/validations/operations";

type ReportMessage = { type: "success" | "error"; text: string };

function Message({ message }: { message?: ReportMessage }) {
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

function useReportSubmit<T extends { error?: string; success?: string } | undefined>(
  action: (formData: FormData) => Promise<T>,
  fallbackSuccess: string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<ReportMessage>();
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

export function ReportExportForm({
  branchId,
  companyId,
  savedReportId,
}: {
  branchId?: string;
  companyId: string;
  savedReportId?: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useReportSubmit(createReportExport, "Report export created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <input type="hidden" name="savedReportId" value={savedReportId ?? ""} />
      <div className="grid gap-2">
        <Label htmlFor="reportType">Report type</Label>
        <select id="reportType" name="reportType" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="inventory">
          {reportTypes.map((type) => (
            <option key={type} value={type}>
              {formatOperationsStatus(type)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="exportFormat">Format</Label>
        <select id="exportFormat" name="exportFormat" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="csv">
          {reportExportFormats.map((format) => (
            <option key={format} value={format}>
              {format.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        <Download className="h-4 w-4" />
        {isPending ? "Creating..." : "Create export"}
      </Button>
    </form>
  );
}

export function ReportScheduleForm({
  branchId,
  companyId,
  email,
  savedReportId,
}: {
  branchId?: string;
  companyId: string;
  email: string;
  savedReportId: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useReportSubmit(createReportSchedule, "Report schedule created.");

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />
      <input type="hidden" name="savedReportId" value={savedReportId} />
      <div className="grid gap-2">
        <Label htmlFor="scheduleName">Name</Label>
        <Input id="scheduleName" name="name" defaultValue="Weekly inventory digest" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="frequency">Frequency</Label>
        <select id="frequency" name="frequency" className="h-9 rounded-md border bg-white px-3 text-sm" defaultValue="weekly">
          {reportScheduleFrequencies.map((frequency) => (
            <option key={frequency} value={frequency}>
              {formatOperationsStatus(frequency)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="recipients">Recipients</Label>
        <Input id="recipients" name="recipients" defaultValue={email} />
      </div>
      <Button type="submit" variant="outline" disabled={isPending}>
        <CalendarClock className="h-4 w-4" />
        {isPending ? "Saving..." : "Save schedule"}
      </Button>
    </form>
  );
}
