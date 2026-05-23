"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Lock, Menu, X } from "lucide-react";
import { getModulesWithAccess } from "@/lib/modules/module-registry";

type AppSidebarProps = {
  enabledModuleKeys: string[];
};

export function AppSidebar({ enabledModuleKeys }: AppSidebarProps) {
  const modules = getModulesWithAccess(enabledModuleKeys);
  const pathname = usePathname();
  const activeHref = modules
    .filter((module) => module.unlocked)
    .filter((module) => pathname === module.href || (module.href !== "/dashboard" && pathname.startsWith(module.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-white/5 bg-[hsl(222,47%,8%)] text-white lg:flex">
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

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {modules.map((module) => {
          const Icon = module.icon;
          const href = module.unlocked ? module.href : "/subscriptions";

          const isActive = module.unlocked && module.href === activeHref;

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

      <div className="border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-400">System Online</span>
        </div>
      </div>
    </aside>
  );
}

export function AppMobileNav({ enabledModuleKeys }: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const modules = getModulesWithAccess(enabledModuleKeys);
  const primaryHrefs = ["/dashboard", "/vehicles", "/crm/leads", "/sales/quotations"];
  const primaryModules = modules
    .filter((module) => module.unlocked)
    .filter((module) => primaryHrefs.includes(module.href));
  const activeHref = modules
    .filter((module) => module.unlocked)
    .filter((module) => pathname === module.href || (module.href !== "/dashboard" && pathname.startsWith(module.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const activeModule = modules.find((module) => module.href === activeHref);
  const visibleModules = primaryModules.slice(0, 4);

  function shortLabel(label: string) {
    return label
      .replace("Vehicle Inventory", "Inventory")
      .replace("Sales CRM", "CRM")
      .replace("Import & Export", "Export")
      .replace("Service Workshop", "Service")
      .replace("Parts Inventory", "Parts")
      .replace("AI Intelligence", "AI");
  }

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-x-0 bottom-[76px] z-40 px-3 pb-2 lg:hidden">
          <button
            type="button"
            aria-label="Close module menu backdrop"
            className="fixed inset-0 -z-10 bg-slate-950/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="dialog"
            aria-label="All modules"
            className="mx-auto max-h-[68vh] max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-950 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-sm font-semibold">All modules</p>
                <p className="truncate text-xs text-slate-300">
                  Active section: {activeModule?.label ?? "Dashboard"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close module menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-slate-200"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid max-h-[calc(68vh-64px)] gap-2 overflow-y-auto p-3 sm:grid-cols-2">
              {modules.map((module) => {
                const Icon = module.icon;
                const href = module.unlocked ? module.href : "/subscriptions";
                const isActive = module.unlocked && module.href === activeHref;

                return (
                  <Link
                    key={module.key}
                    href={href}
                    aria-disabled={!module.unlocked}
                    onClick={() => setIsOpen(false)}
                    className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                      isActive
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : module.unlocked
                          ? "border-slate-200 bg-white text-slate-700"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{module.label}</span>
                    {!module.unlocked ? <Lock className="h-3.5 w-3.5 shrink-0" /> : null}
                    {isActive ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
                        Active section
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Mobile module navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {visibleModules.map((module) => {
            const Icon = module.icon;
            const isActive = module.href === activeHref;

            return (
              <Link
                key={module.key}
                href={module.href}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-semibold transition ${
                  isActive ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="max-w-full truncate">{shortLabel(module.label)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-label={isOpen ? "Close module menu" : "Open module menu"}
            aria-expanded={isOpen}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-semibold transition ${
              isOpen || (activeHref && !visibleModules.some((module) => module.href === activeHref))
                ? "bg-slate-950 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
            onClick={() => setIsOpen((open) => !open)}
          >
            <Menu className="h-4 w-4 shrink-0" />
            <span className="max-w-full truncate">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
