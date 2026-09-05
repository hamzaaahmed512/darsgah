export type BillingCycle = "monthly" | "yearly";

export const plans = [
  { id: "basic", name: "Basic", bestFor: "Small schools", students: "Up to 100", monthly: "Rs 1,999", regular: "Rs 2,499", annualRegular: "Rs 29,988", discount: "20%", yearly: "Rs 25,940", imports: "3", storage: "1 GB", priority: false, analytics: false, campuses: false, branding: false, popular: false },
  { id: "standard", name: "Standard", bestFor: "Growing schools", students: "Up to 250", monthly: "Rs 3,999", regular: "Rs 4,999", annualRegular: "Rs 59,988", discount: "20%", yearly: "Rs 51,890", imports: "10", storage: "3 GB", priority: true, analytics: false, campuses: false, branding: false, popular: true },
  { id: "advanced", name: "Advanced", bestFor: "Established schools", students: "Up to 500", monthly: "Rs 6,499", regular: "Rs 7,999", annualRegular: "Rs 95,988", discount: "18.8%", yearly: "Rs 83,030", imports: "25", storage: "7 GB", priority: true, analytics: true, campuses: false, branding: false, popular: false },
  { id: "enterprise", name: "Enterprise", bestFor: "Large or multi-campus schools", students: "Up to 1,000", monthly: "Rs 9,999", regular: "Rs 12,999", annualRegular: "Rs 155,988", discount: "23.1%", yearly: "Rs 134,930", imports: "50", storage: "15 GB", priority: true, analytics: true, campuses: true, branding: true, popular: false },
] as const;

export type PlanId = (typeof plans)[number]["id"];
export const isPlanId = (value: unknown): value is PlanId => typeof value === "string" && plans.some((plan) => plan.id === value);
export const isBillingCycle = (value: unknown): value is BillingCycle => value === "monthly" || value === "yearly";

export const pricingFaqs = [
  ["What plans are available?", "Darsgah offers Basic for up to 100 students, Standard for up to 250, Advanced for up to 500, and Enterprise for up to 1,000."],
  ["How does early bird pricing work?", "The displayed early bird monthly rate applies for the first 12 months. After that, the regular monthly rate for your selected plan applies."],
  ["Can I pay yearly?", "Yes. Yearly billing is available for all four plans. Annual totals are Rs 25,940 for Basic, Rs 51,890 for Standard, Rs 83,030 for Advanced, and Rs 134,930 for Enterprise. These totals save approximately 13.5% compared with 12 months of regular monthly pricing."],
  ["What features are included in every plan?", "Every plan includes all core features, unlimited CSV/Excel imports, and email support. Student capacity, AI document import allowances, storage, and additional features vary by plan."],
  ["How many AI document imports are included?", "Basic includes 3 per month, Standard 10, Advanced 25, and Enterprise 50. These remain monthly allowances when paying yearly."],
  ["Which plan supports multiple campuses?", "Enterprise includes multi-campus support and a student limit of up to 1,000."],
  ["What if my school has more than 1,000 students?", "Contact our team to discuss your requirements and receive a tailored quote."],
  ["Can you customize the app or build a solution for our school?", "Yes. We can customize Darsgah or build a tailored solution. The cost varies based on your requirements, features, workflows, integrations, and scope. Custom development is quoted separately from standard subscriptions."],
  ["How do I get started?", "Choose a plan and select “Book a demo.” Our team will discuss your school’s requirements and the next steps."],
] as const;
