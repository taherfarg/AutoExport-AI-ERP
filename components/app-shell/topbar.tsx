import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  companyName: string;
  userEmail: string;
};

export function Topbar({ companyName, userEmail }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <p className="text-sm text-slate-500">Workspace</p>
        <h1 className="text-lg font-semibold text-slate-950">{companyName}</h1>
      </div>
      <form action={signOut} className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{userEmail}</span>
        <Button variant="outline" size="sm" type="submit">
          Sign out
        </Button>
      </form>
    </header>
  );
}
