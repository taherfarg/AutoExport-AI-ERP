import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-4">
        <AuthForm
          title="Sign in to AutoSphere ERP"
          description="Access your dealership workspace."
          action={signIn}
          submitLabel="Sign in"
        />
        <p className="text-center text-sm text-slate-300">
          New workspace?{" "}
          <Link className="text-orange-300" href="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
