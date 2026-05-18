import { z } from "zod";

export const createBranchSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(20),
  countryCode: z.string().length(2).transform((value) => value.toUpperCase()),
  city: z.string().min(2).max(80),
  currencyCode: z.string().length(3).transform((value) => value.toUpperCase()),
});
