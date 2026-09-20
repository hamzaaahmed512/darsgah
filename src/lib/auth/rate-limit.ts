import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const developmentKey = randomBytes(32);

export async function consumeAuthRateLimit(bucket: "login" | "password_reset" | "parent_login" | "contact_enquiry" | "branding_upload" | "api", limit: number, windowSeconds: number) {
  const requestHeaders = await headers();
  const trustedHeader = process.env.VERCEL ? "x-vercel-forwarded-for" : "x-forwarded-for";
  const address = requestHeaders.get(trustedHeader)?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip") || "unknown";
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("AUTH_RATE_LIMIT_SECRET is missing or too short.");
  }
  const keyHash = createHmac("sha256", secret || developmentKey).update(address).digest("hex");
  const { data, error } = await createAdminClient().rpc("consume_auth_rate_limit", {
    p_bucket: bucket, p_key_hash: keyHash, p_limit: limit, p_window_seconds: windowSeconds
  });
  if (error) throw new Error("Auth rate limiter is unavailable.");
  return data === true;
}
