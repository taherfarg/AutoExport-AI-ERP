"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getBusinessRoleOption } from "@/lib/auth/business-roles";
import { createClient } from "@/lib/supabase/server";

const authSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

const signupSchema = authSchema.extend({
  fullName: z.string().trim().min(2).max(120),
  businessRole: z.string().trim().optional(),
});

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check the account or use password reset.";
  }

  if (normalized.includes("email not confirmed")) {
    return "This email is not confirmed yet. Check the inbox or local Mailpit confirmation link.";
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "This email already has an account. Sign in instead.";
  }

  return "Authentication failed. Please check the details and try again.";
}

export async function signIn(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    businessRole: formData.get("businessRole"),
  });

  if (!parsed.success) {
    return { error: "Enter your name, a valid email, a role, and a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const role = getBusinessRoleOption(parsed.data.businessRole);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        business_role: role.key,
      },
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: "This email already has an account. Sign in instead." };
  }

  redirect("/onboarding/company");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
