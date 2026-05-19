import {
  AlertTriangle,
  BarChart3,
  Calendar,
  FileSearch,
  ShieldAlert,
  TrendingDown,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { DashboardKpis } from "@/features/dashboard/queries";

type InsightItem = {
  icon: LucideIcon;
  iconColor: string;
  text: string;
  priority: "high" | "medium" | "low";
};

function generateInsights(kpis: DashboardKpis): InsightItem[] {
  const insights: InsightItem[] = [];

  if (kpis.agingStock60Days > 0) {
    insights.push({
      icon: TrendingDown,
      iconColor: "text-rose-500",
      text: `${kpis.agingStock60Days} vehicle${kpis.agingStock60Days > 1 ? "s" : ""} in stock over 60 days — consider price adjustments`,
      priority: "high",
    });
  }

  if (kpis.lowMarginCars > 0) {
    insights.push({
      icon: ShieldAlert,
      iconColor: "text-amber-500",
      text: `${kpis.lowMarginCars} vehicle${kpis.lowMarginCars > 1 ? "s" : ""} with margin below 5% — review pricing strategy`,
      priority: "high",
    });
  }

  if (kpis.followUpsDueToday > 0) {
    insights.push({
      icon: Calendar,
      iconColor: "text-blue-500",
      text: `${kpis.followUpsDueToday} follow-up${kpis.followUpsDueToday > 1 ? "s" : ""} due today — don't miss potential deals`,
      priority: "high",
    });
  }

  if (kpis.missingDocuments > 0) {
    insights.push({
      icon: FileSearch,
      iconColor: "text-orange-500",
      text: `${kpis.missingDocuments} vehicle${kpis.missingDocuments > 1 ? "s" : ""} with incomplete documents`,
      priority: "medium",
    });
  }

  if (kpis.inTransit > 0) {
    insights.push({
      icon: Truck,
      iconColor: "text-cyan-500",
      text: `${kpis.inTransit} shipment${kpis.inTransit > 1 ? "s" : ""} currently in transit`,
      priority: "low",
    });
  }

  if (kpis.underCustoms > 0) {
    insights.push({
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      text: `${kpis.underCustoms} shipment${kpis.underCustoms > 1 ? "s" : ""} under customs clearance`,
      priority: "medium",
    });
  }

  if (kpis.pendingPayments > 0) {
    insights.push({
      icon: BarChart3,
      iconColor: "text-violet-500",
      text: `Pending receivables: ${formatCurrency(kpis.pendingPayments, kpis.currency)}`,
      priority: "medium",
    });
  }

  // Always show at least some context
  if (insights.length === 0) {
    insights.push({
      icon: BarChart3,
      iconColor: "text-emerald-500",
      text: "All operations running smoothly — no urgent issues detected",
      priority: "low",
    });
  }

  return insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  }).slice(0, 5);
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function AiInsightsCard({ kpis }: { kpis: DashboardKpis }) {
  const insights = generateInsights(kpis);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Insights</h3>
          <p className="text-[10px] text-muted-foreground">Real-time business intelligence</p>
        </div>
      </div>
      <div className="space-y-3">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          const priorityDot =
            insight.priority === "high"
              ? "bg-rose-400"
              : insight.priority === "medium"
                ? "bg-amber-400"
                : "bg-emerald-400";

          return (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/30 px-3.5 py-2.5 hover:bg-muted/60 transition-colors"
            >
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${insight.iconColor}`} />
              <p className="text-xs leading-relaxed text-foreground/80 flex-1">
                {insight.text}
              </p>
              <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${priorityDot}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
