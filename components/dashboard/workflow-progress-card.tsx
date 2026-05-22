import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowStepStatus } from "@/lib/workflows/progress";

type WorkflowStep = {
  label: string;
  value: string;
  hint: string;
  status: WorkflowStepStatus;
};

type WorkflowProgressCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  steps: WorkflowStep[];
};

const statusConfig: Record<
  WorkflowStepStatus,
  {
    label: string;
    className: string;
    icon: LucideIcon;
  }
> = {
  complete: {
    label: "Clear",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  active: {
    label: "Active",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    icon: Clock3,
  },
  attention: {
    label: "Review",
    className: "border-orange-200 bg-orange-50 text-orange-700",
    icon: AlertTriangle,
  },
  idle: {
    label: "Idle",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    icon: CircleDashed,
  },
};

export function WorkflowProgressCard({ title, description, icon: Icon, steps }: WorkflowProgressCardProps) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-5 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <Icon className="h-5 w-5 text-orange-300" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg text-white">{title}</CardTitle>
              <p className="mt-1 max-w-3xl text-sm text-slate-300">{description}</p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
            Live operational posture
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => {
          const config = statusConfig[step.status];
          const StatusIcon = config.icon;

          return (
            <div key={step.label} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-slate-500">{step.label}</p>
                  <p className="mt-2 break-words text-xl font-semibold text-slate-950">{step.value}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${config.className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {config.label}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{step.hint}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

