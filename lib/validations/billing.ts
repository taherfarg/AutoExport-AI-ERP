import { z } from "zod";

export const billingCustomerSchema = z.object({
  companyId: z.uuid(),
  billingEmail: z.email(),
  billingName: z.string().trim().min(2),
  defaultCurrencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
});

export const checkoutSessionSchema = z.object({
  companyId: z.uuid(),
  packageId: z.uuid(),
});

export const portalSessionSchema = z.object({
  companyId: z.uuid(),
});

export const refreshUsageSchema = z.object({
  companyId: z.uuid(),
});
