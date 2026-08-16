import { afterEach, describe, expect, it, vi } from "vitest";
import { readPublicSupabaseEnv } from "@/lib/supabase/env";

describe("readPublicSupabaseEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the server-side Supabase vars when both sets are present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stale-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stale-key");
    vi.stubEnv("SUPABASE_URL", " https://live-project.supabase.co ");
    vi.stubEnv("SUPABASE_ANON_KEY", "  live-key  ");

    expect(readPublicSupabaseEnv()).toEqual({
      url: "https://live-project.supabase.co",
      anonKey: "live-key",
    });
  });

  it("falls back to the non-public Supabase vars when Vercel only exposes the unprefixed names", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_URL", " https://example.supabase.co ");
    vi.stubEnv("SUPABASE_ANON_KEY", "  test-anon-key  ");

    expect(readPublicSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "test-anon-key",
    });
  });
});
