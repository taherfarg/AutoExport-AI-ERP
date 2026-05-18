import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(160).optional(),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/),
  countryCode: z.string().length(2).transform((value) => value.toUpperCase()),
  currencyCode: z.string().length(3).transform((value) => value.toUpperCase()),
});
