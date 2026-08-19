import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
