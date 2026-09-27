"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminUser } from "@/lib/platform/auth";
import { defaultDestinationForRole, resolveAuthDestination } from "@/lib/auth/destination";
import { normalizeEmail } from "@/lib/email";
import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";
import type { UserRole } from "@/types/database";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").transform(normalizeEmail),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional()
});

export type SignInValues = z.infer<typeof signInSchema>;

type AuthRoutingContext = {
  must_change_password: boolean;
  school_role: UserRole | null;
  is_platform_admin: boolean;
};

export async function signInAction(values: SignInValues) {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  try {
    if (!await consumeAuthRateLimit("login", 5, 60)) {
      return { error: "Too many sign-in attempts. Try again in a minute." };
    }
  } catch {
    return { error: "Sign-in is temporarily unavailable." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { error: "Unable to sign in with those credentials." };
    }

    const routingResult = await supabase.rpc("get_auth_routing_context").maybeSingle<AuthRoutingContext>();
    let routing = routingResult.data;

    // Rolling-deploy fallback for environments where the optimized routing RPC
    // has not been applied yet.
    if (routingResult.error && ["PGRST202", "42883"].includes(routingResult.error.code)) {
      const [isPlatformAdmin, appUserResult] = await Promise.all([
        isPlatformAdminUser(data.user.id),
        supabase.rpc("get_current_app_user").maybeSingle<{ must_change_password: boolean; role: UserRole }>()
      ]);
      if (appUserResult.error && !["PGRST202", "42883"].includes(appUserResult.error.code)) {
        throw new Error("Unable to resolve the signed-in account.");
      }
      routing = {
        must_change_password: Boolean(appUserResult.data?.must_change_password),
        school_role: appUserResult.data?.role ?? null,
        is_platform_admin: isPlatformAdmin
      };
    } else if (routingResult.error) {
      throw new Error("Unable to resolve the signed-in account.");
    }

    const destination = resolveAuthDestination(
      parsed.data.next,
      Boolean(routing?.is_platform_admin),
      defaultDestinationForRole(routing?.school_role)
    );

    if (routing?.must_change_password) {
      return { destination: `/change-password?next=${encodeURIComponent(destination)}` };
    }

    return { destination };
  } catch {
    console.error("Sign in failed.");
    return { error: "Unable to sign in right now. Please try again." };
  }
}

