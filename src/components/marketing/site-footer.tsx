import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { Brand } from "@/components/marketing/brand";

const productLinks = [
  ["Overview", "/"], ["Features", "/features"], ["Pricing", "/pricing"], ["Sign in", "/sign-in"]
];
const companyLinks = [
  ["About us", "/about"], ["Contact", "/contact"], ["FAQs", "/faqs"], ["Privacy", "/privacy"]
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#f8fafc]">
      <div className="marketing-container grid gap-12 py-14 md:grid-cols-[1.5fr_0.7fr_0.7fr]">
        <div>
          <Brand />
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
            Darsgah brings school operations into one calm, connected workspace, built for the people who keep education moving.
          </p>
          <a href="mailto:darsgah.help@gmail.com" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-ink">
            <Mail className="h-4 w-4" /> darsgah.help@gmail.com
          </a>
        </div>
        <FooterColumn title="Product" links={productLinks} />
        <FooterColumn title="Company" links={companyLinks} />
      </div>
      <div className="marketing-container flex flex-col gap-3 border-t border-slate-200 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} GetDarsgah. All rights reserved.</p>
        <p>School management, made clear.</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">{title}</p>
      <div className="mt-5 grid gap-3">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="group flex w-fit items-center gap-1 text-sm text-muted hover:text-primary">
            {label}<ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
