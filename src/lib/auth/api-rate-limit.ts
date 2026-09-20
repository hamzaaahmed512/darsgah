import { consumeAuthRateLimit } from "@/lib/auth/rate-limit";
import { publicApiError } from "@/lib/public-error";

export async function apiRateLimitResponse() {
  try {
    return await consumeAuthRateLimit("api", 120, 60) ? null : publicApiError(429);
  } catch (error) {
    return publicApiError(503, error);
  }
}
