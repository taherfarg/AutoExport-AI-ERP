import Link from "next/link";
import { filterModulesByPackage } from "@/lib/modules/module-registry";

type AppSidebarProps = {
  enabledModuleKeys: string[];
};

export function AppSidebar({ enabledModuleKeys }: AppSidebarProps) {
  const modules = filterModulesByPackage(enabledModuleKeys);

  return (
    <aside className="hidden w-72 border-r bg-slate-950 text-white lg:block">
      <div className="px-6 py-5">
        <p className="text-lg font-semibold">AutoSphere ERP</p>
        <p className="text-xs text-slate-400">Automotive SaaS Command Center</p>
      </div>
      <nav className="space-y-1 px-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.key}
              href={module.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              <Icon className="h-4 w-4 text-orange-300" />
              {module.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
