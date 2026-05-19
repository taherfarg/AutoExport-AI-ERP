import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

type KpiCardProps = {
  title: string;
  value: string;
  hint: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
};

export function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  iconColor = "text-orange-500",
  iconBgColor = "bg-orange-50",
  trend,
  trendLabel,
}: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-600 bg-emerald-50"
      : trend === "down"
        ? "text-rose-600 bg-rose-50"
        : "text-slate-500 bg-slate-100";

  return (
    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      {/* Subtle gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-400 via-orange-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
          </div>
          {Icon && (
            <div
              className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${iconBgColor} transition-transform group-hover:scale-110`}
            >
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {trend && trendLabel && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${trendColor}`}
            >
              <TrendIcon className="h-3 w-3" />
              {trendLabel}
            </span>
          )}
          <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
