import { NextResponse } from "next/server";
import { getStripeServerConfig, verifyStripeWebhookSignature } from "@/lib/billing/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type StripeLikeEvent = {
  id: string;
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getMetadata(object: Record<string, unknown>) {
  const metadata = object.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

async function resolveCompanyId(eventObject: Record<string, unknown>) {
  const metadata = getMetadata(eventObject);
  const metadataCompanyId = getString(metadata.company_id);
  if (metadataCompanyId) {
    return metadataCompanyId;
  }

  const customerId = getString(eventObject.customer);
  const subscriptionId = getString(eventObject.subscription) ?? getString(eventObject.id);
  const supabase = createServiceRoleClient();

  if (customerId) {
    const { data } = await supabase
      .from("billing_customers")
      .select("company_id")
      .eq("provider", "stripe")
      .eq("provider_customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (data?.company_id) {
      return data.company_id as string;
    }
  }

  if (subscriptionId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("company_id")
      .eq("billing_subscription_id", subscriptionId)
      .limit(1)
      .maybeSingle();

    if (data?.company_id) {
      return data.company_id as string;
    }
  }

  return null;
}

async function processBillingEvent(event: StripeLikeEvent, companyId: string | null) {
  const supabase = createServiceRoleClient();
  const eventObject = event.data?.object ?? {};
  let status: "processed" | "ignored" | "failed" = "processed";
  let errorMessage: string | null = null;

  try {
    if (event.type === "checkout.session.completed") {
      const metadata = getMetadata(eventObject);
      const packageKey = getString(metadata.package_key);
      const customerId = getString(eventObject.customer);
      const subscriptionId = getString(eventObject.subscription);
      const customerEmail = getString(eventObject.customer_email);

      if (!companyId || !packageKey) {
        throw new Error("Checkout session is missing company or package metadata.");
      }

      const { data: packageData } = await supabase
        .from("packages")
        .select("id")
        .eq("package_key", packageKey)
        .single();

      if (!packageData?.id) {
        throw new Error(`Package ${packageKey} was not found.`);
      }

      if (customerId) {
        await supabase.from("billing_customers").upsert(
          {
            company_id: companyId,
            provider: "stripe",
            provider_customer_id: customerId,
            billing_email: customerEmail,
            status: "active",
            metadata: { checkout_session_id: eventObject.id },
          },
          { onConflict: "company_id,provider" },
        );
      }

      await supabase
        .from("subscriptions")
        .update({
          package_id: packageData.id,
          status: "active",
          billing_customer_id: customerId,
          billing_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .is("deleted_at", null);
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscriptionId = getString(eventObject.id);
      const customerId = getString(eventObject.customer);
      const subscriptionStatus = getString(eventObject.status);

      if (companyId && subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({
            billing_customer_id: customerId,
            billing_subscription_id: subscriptionId,
            status: subscriptionStatus === "past_due" ? "past_due" : "active",
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .is("deleted_at", null);
      } else {
        status = "ignored";
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscriptionId = getString(eventObject.id);
      if (companyId && subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("billing_subscription_id", subscriptionId);
      } else {
        status = "ignored";
      }
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      if (companyId) {
        await supabase
          .from("subscriptions")
          .update({
            status: event.type === "invoice.paid" ? "active" : "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .is("deleted_at", null);
      } else {
        status = "ignored";
      }
    } else {
      status = "ignored";
    }
  } catch (error) {
    status = "failed";
    errorMessage = error instanceof Error ? error.message : "Webhook processing failed.";
  }

  await supabase.from("billing_events").upsert(
    {
      company_id: companyId,
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      event_status: status,
      payload: event as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    },
    { onConflict: "provider,provider_event_id" },
  );

  return { status, errorMessage };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const { webhookSecret } = getStripeServerConfig();

  if (webhookSecret && !verifyStripeWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  let event: StripeLikeEvent;
  try {
    event = JSON.parse(rawBody) as StripeLikeEvent;
  } catch {
    return NextResponse.json({ error: "Webhook payload is not valid JSON." }, { status: 400 });
  }

  if (!event.id || !event.type) {
    return NextResponse.json({ error: "Webhook event is missing id or type." }, { status: 400 });
  }

  const companyId = await resolveCompanyId(event.data?.object ?? {});
  const result = await processBillingEvent(event, companyId);

  return NextResponse.json({ received: true, ...result });
}
