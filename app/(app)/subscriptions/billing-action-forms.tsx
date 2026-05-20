"use client";

import { FormEvent, ReactNode, useRef, useState, useTransition } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  refreshUsageCounters,
  saveBillingCustomer,
} from "@/features/billing/actions";

type BillingActionResult = {
  success?: string;
  error?: string;
  url?: string;
};

type BillingMessage = {
  type: "success" | "error";
  text: string;
  url?: string;
};

function Message({ message }: { message?: BillingMessage }) {
  if (!message) return null;

  return (
    <div
      className={
        message.type === "error"
          ? "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          : "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      }
    >
      <div>{message.text}</div>
      {message.url ? (
        <a className="mt-2 inline-flex items-center gap-1 font-medium underline" href={message.url}>
          Open billing session <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  );
}

function useBillingSubmit(action: (formData: FormData) => Promise<BillingActionResult>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<BillingMessage>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(undefined);

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: result.success ?? "Saved.", url: result.url });
      formRef.current?.reset();
      router.replace(`${window.location.pathname}?billing=${Date.now()}`);
      router.refresh();
    });
  }

  return { formRef, message, isPending, handleSubmit };
}

function Field({ children }: { children: ReactNode }) {
  return <div className="grid gap-2">{children}</div>;
}

export function BillingCustomerForm({
  companyId,
  defaultEmail,
  defaultName,
  defaultCurrencyCode,
}: {
  companyId: string;
  defaultEmail: string;
  defaultName: string;
  defaultCurrencyCode: string;
}) {
  const { formRef, message, isPending, handleSubmit } = useBillingSubmit(saveBillingCustomer);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
      <div className="md:col-span-3">
        <Message message={message} />
      </div>
      <input type="hidden" name="companyId" value={companyId} />
      <Field>
        <Label htmlFor="billingName">Billing name</Label>
        <Input id="billingName" name="billingName" defaultValue={defaultName} required />
      </Field>
      <Field>
        <Label htmlFor="billingEmail">Billing email</Label>
        <Input id="billingEmail" name="billingEmail" type="email" defaultValue={defaultEmail} required />
      </Field>
      <Field>
        <Label htmlFor="defaultCurrencyCode">Currency</Label>
        <Input id="defaultCurrencyCode" name="defaultCurrencyCode" defaultValue={defaultCurrencyCode} maxLength={3} required />
      </Field>
      <div className="md:col-span-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save billing customer"}
        </Button>
      </div>
    </form>
  );
}

export function UsageRefreshForm({ companyId }: { companyId: string }) {
  const { formRef, message, isPending, handleSubmit } = useBillingSubmit(refreshUsageCounters);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <Button type="submit" variant="outline" disabled={isPending}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {isPending ? "Refreshing..." : "Refresh usage"}
      </Button>
    </form>
  );
}

export function CheckoutSessionForm({
  companyId,
  packageId,
  label,
  current,
}: {
  companyId: string;
  packageId: string;
  label: string;
  current?: boolean;
}) {
  const { formRef, message, isPending, handleSubmit } = useBillingSubmit(createCheckoutSession);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="packageId" value={packageId} />
      <Button type="submit" disabled={isPending} variant={current ? "outline" : "default"}>
        {isPending ? "Creating..." : current ? "Renew or manage checkout" : label}
      </Button>
    </form>
  );
}

export function PortalSessionForm({ companyId }: { companyId: string }) {
  const { formRef, message, isPending, handleSubmit } = useBillingSubmit(createCustomerPortalSession);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <Message message={message} />
      <input type="hidden" name="companyId" value={companyId} />
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Opening..." : "Open billing portal"}
      </Button>
    </form>
  );
}
