import type { ReactNode } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { requirePlatformAdmin } from "@/lib/platform/auth";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdmin();
  return <PlatformShell email={admin.email}>{children}</PlatformShell>;
}
