"use client";

import { useState, useTransition } from "react";
import { BUSINESS_ROLE_OPTIONS } from "@/lib/auth/business-roles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<{ error: string } | void>;
  submitLabel: string;
  mode?: "signin" | "signup";
};

export function AuthForm({ title, description, action, submitLabel, mode = "signin" }: AuthFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">{title}</h1>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await action(formData);
              if (result?.error) {
                setError(result.error);
              }
            });
          }}
        >
          {isSignup ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" type="text" autoComplete="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessRole">Primary role</Label>
                <select
                  id="businessRole"
                  name="businessRole"
                  defaultValue="company_owner"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  {BUSINESS_ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  This categorizes the profile. Workspace permissions are still controlled by roles.
                </p>
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
            />
          </div>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" aria-live="polite">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait" : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
