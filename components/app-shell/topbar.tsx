import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, User } from "lucide-react";

type TopbarProps = {
  companyName: string;
  userEmail: string;
};

export function Topbar({ companyName, userEmail }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 sticky top-0 z-30">
      {/* Left — workspace info */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm">
          <Building2 className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-tight">
            {companyName}
          </h1>
          <p className="text-[11px] text-muted-foreground">Active workspace</p>
        </div>
      </div>

      {/* Right — user actions */}
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 sm:flex">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{userEmail}</span>
        </div>
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
