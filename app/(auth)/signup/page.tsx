import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-4">
        <AuthForm
          title="Create your AutoSphere ERP account"
          description="Start a secure dealership workspace."
          action={signUp}
          submitLabel="Create account"
        />
        <p className="text-center text-sm text-slate-300">
          Already registered?{" "}
          <Link className="text-orange-300" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
