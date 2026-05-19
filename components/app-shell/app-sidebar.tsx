"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { getModulesWithAccess } from "@/lib/modules/module-registry";

type AppSidebarProps = {
  enabledModuleKeys: string[];
};

export function AppSidebar({ enabledModuleKeys }: AppSidebarProps) {
  const modules = getModulesWithAccess(enabledModuleKeys);
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-white/5 bg-[hsl(222,47%,8%)] text-white lg:flex">
      {/* Brand header */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/20">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">AutoSphere</p>
            <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
              ERP Command Center
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {modules.map((module) => {
          const Icon = module.icon;
          const href = module.unlocked ? module.href : "/subscriptions";
          const isActive =
            module.unlocked &&
            (pathname === module.href ||
              (module.href !== "/dashboard" && pathname.startsWith(module.href)));

          return (
            <Link
              key={module.key}
              href={href}
              aria-disabled={!module.unlocked}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-orange-500/15 to-orange-500/5 text-orange-300 shadow-sm"
                  : module.unlocked
                    ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    : "text-slate-600 hover:bg-white/5 hover:text-slate-400"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{module.label}</span>
              {!module.unlocked && <Lock className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400" />}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar footer */}
      <div className="border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-400">System Online</span>
        </div>
      </div>
    </aside>
  );
}
