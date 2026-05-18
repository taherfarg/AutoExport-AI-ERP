"use server";

import { z } from "zod";

const inviteUserSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid(),
});

export async function validateInviteUser(formData: FormData) {
  const parsed = inviteUserSchema.safeParse({
    companyId: formData.get("companyId"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: "Invite details are invalid." };
  }

  return { data: parsed.data };
}
