import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, User } from "lucide-react";

type TopbarProps = {
  companyName: string;
  userEmail: string;
};

export function Topbar({ companyName, userEmail }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border/50 bg-card/90 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm">
          <Building2 className="h-4 w-4 text-slate-600" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight text-foreground">
            {companyName}
          </h1>
          <p className="text-[11px] text-muted-foreground">Active workspace</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden max-w-[240px] items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 sm:flex">
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
        </div>
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="gap-2 px-2 text-xs text-muted-foreground hover:text-foreground sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
