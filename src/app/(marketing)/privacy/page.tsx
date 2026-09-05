import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/shared";

export const metadata: Metadata = { title: "Privacy policy | GetDarsgah", description: "How GetDarsgah handles information when you visit our website or contact our team." };

const sections = [
  ["1. Scope", "This privacy policy explains how GetDarsgah handles information submitted through this public website and during sales or support conversations. A school's use of the Darsgah management system may also be governed by its service agreement and the school's own privacy responsibilities."],
  ["2. Information you provide", "We may receive information you choose to share, such as your name, work email address, school name, role, and the contents of an enquiry. Contact form submissions are securely emailed to the Darsgah team so we can respond to your request."],
  ["3. Information collected automatically", "Our hosting and security providers may process limited technical information needed to deliver and protect the website, such as IP address, browser type, device information, request time, and pages requested. We do not use this website to collect student records."],
  ["4. How we use information", "We use information to respond to enquiries, arrange demonstrations, prepare relevant proposals, provide requested services, maintain website security, diagnose technical issues, and meet legal obligations."],
  ["5. How information is shared", "We do not sell personal information. Information may be handled by service providers that support website hosting, communications, security, and business operations, or disclosed where required by law. Providers should only process information for the relevant service."],
  ["6. Data relating to schools", "When a school uses Darsgah, the school controls the records entered by its authorized users. Access is designed around school membership and assigned roles. Specific hosting, retention, security, and processing terms should be confirmed in the agreement for that school."],
  ["7. Retention", "We keep business correspondence only for as long as reasonably needed to answer requests, maintain a business relationship, resolve disputes, and meet legal or accounting requirements. Technical logs are retained according to the policies and settings of the relevant infrastructure providers."],
  ["8. Security", "We use reasonable administrative and technical measures intended to protect information. No online service can guarantee absolute security, so schools and users should also protect account credentials and report suspected unauthorized access promptly."],
  ["9. Your choices", "You may ask us to correct or delete information you previously provided, subject to legal and operational retention requirements. You may also choose not to provide optional information, although this can limit our ability to respond to a request."],
  ["10. Changes to this policy", "We may update this policy as our services or legal obligations change. The revised version will be posted on this page with a new effective date."],
  ["11. Contact", "For privacy questions or requests, email privacy@getdarsgah.com. Please do not send passwords, student records, or other sensitive school data by email."]
];

export default function PrivacyPage() {
  return <>
    <PageHero eyebrow="Legal" title="Privacy policy" description="A clear overview of the information handled through the GetDarsgah website and how you can contact us about privacy." />
    <section className="marketing-container py-20"><div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[220px_1fr]"><aside><div className="marketing-card sticky top-28 rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">Policy details</p><p className="mt-4 text-sm text-muted">Effective: 18 August 2026</p><p className="mt-2 text-sm text-muted">Website: getdarsgah</p></div></aside><article className="space-y-10">{sections.map(([title, body]) => <section key={title}><h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2><p className="mt-3 text-sm leading-7 text-muted">{body}</p></section>)}</article></div></section>
  </>;
}
