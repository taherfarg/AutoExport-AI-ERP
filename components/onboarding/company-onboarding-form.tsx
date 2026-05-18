"use client";

import { type FormEvent, useRef, useState } from "react";
import { createCompany } from "@/features/companies/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompanyOnboardingForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submitForm() {
    const form = formRef.current;
    if (!form) {
      return;
    }
    const formData = new FormData(form);

    setError(null);
    setPending(true);
    try {
      const result = await createCompany(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      window.location.assign("/dashboard");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitForm();
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Create dealership workspace</CardTitle>
        <CardDescription>
          Set the company identity used for tenant isolation, billing, and branch setup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          ref={formRef}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" name="legalName" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Workspace slug</Label>
            <Input id="slug" name="slug" required aria-label="Workspace slug example: pollux-motors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="countryCode">Country</Label>
              <Input id="countryCode" name="countryCode" defaultValue="AE" maxLength={2} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Input id="currencyCode" name="currencyCode" defaultValue="AED" maxLength={3} required />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" disabled={pending} onClick={() => void submitForm()}>
            {pending ? "Creating workspace" : "Create workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
