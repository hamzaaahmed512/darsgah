import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { consumeAuthRateLimit } from "./rate-limit";

describe("auth rate limiting", () => {
  beforeEach(() => { rpc.mockReset(); });

  it("uses a keyed digest rather than sending the raw client IP to the database", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await consumeAuthRateLimit("login", 5, 60)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("consume_auth_rate_limit", expect.objectContaining({
      p_bucket: "login", p_limit: 5, p_window_seconds: 60
    }));
    expect(rpc.mock.calls[0][1].p_key_hash).not.toContain("203.0.113.7");
  });

  it("fails closed when the shared limiter cannot be reached", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    await expect(consumeAuthRateLimit("password_reset", 3, 3600)).rejects.toThrow("unavailable");
  });
});
