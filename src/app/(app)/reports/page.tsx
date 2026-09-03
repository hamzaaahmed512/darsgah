import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Activity,
  Banknote,
  BookOpenCheck,
  Bus,
  CalendarCheck,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Printer,
  Receipt,
  Settings,
  Users
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/permissions";
import { currentMonthKey } from "@/lib/services/payroll";
import { cn } from "@/lib/utils";

type ReportAction = {
  label: string;
  href: string;
  kind: "open" | "print" | "csv";
  external?: boolean;
};

type ReportItem = {
  title: string;
  description: string;
  area: string;
  icon: LucideIcon;
  permission: Permission;
  formats: string[];
  actions: ReportAction[];
  ownerOnly?: boolean;
};

function todayKey() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function reportCatalog(month: string, today: string): ReportItem[] {
  return [
    {
      title: "Daily Attendance Report",
      description: "Student attendance register for a selected date and class.",
      area: "Attendance",
      icon: CalendarCheck,
      permission: "attendance:view",
      formats: ["Print/PDF", "Screen"],
      actions: [
        { label: "Open", href: `/attendance?date=${today}`, kind: "open" },
        { label: "Print/PDF", href: `/attendance?date=${today}`, kind: "print" }
      ]
    },
    {
      title: "Teacher Attendance Report",
      description: "Daily staff attendance register for teachers and head teachers.",
      area: "Attendance",
      icon: ClipboardList,
      permission: "attendance:view",
      formats: ["Print/PDF", "Screen"],
      actions: [
        { label: "Open", href: `/attendance?view=teachers&date=${today}`, kind: "open" },
        { label: "Print/PDF", href: `/attendance?view=teachers&date=${today}`, kind: "print" }
      ]
    },
    {
      title: "Student Directory",
      description: "Active student list with class, admission number, guardian details, and filters.",
      area: "Students",
      icon: GraduationCap,
      permission: "students:view",
      formats: ["CSV", "Screen"],
      actions: [
        { label: "Open", href: "/students", kind: "open" },
        { label: "CSV", href: "/students", kind: "csv" }
      ]
    },
    {
      title: "Archived Students",
      description: "Students removed from active enrollment with archive dates.",
      area: "Students",
      icon: FileText,
      permission: "students:view",
      formats: ["CSV", "Screen"],
      actions: [
        { label: "Open", href: "/students?status=archived", kind: "open" },
        { label: "CSV", href: "/students?status=archived", kind: "csv" }
      ]
    },
    {
      title: "Class Enrollment Counts",
      description: "Enrollment count by grade, class, and section.",
      area: "Academics",
      icon: Users,
      permission: "classes:manage",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: "/classes", kind: "open" }
      ]
    },
    {
      title: "Results Register",
      description: "Uploaded exam results, approval status, and result workflow.",
      area: "Results",
      icon: BookOpenCheck,
      permission: "results:view",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: "/results", kind: "open" }
      ]
    },
    {
      title: "Result Cards",
      description: "Official printable result cards for approved examinations.",
      area: "Results",
      icon: Printer,
      permission: "results:generate",
      formats: ["Print/PDF"],
      actions: [
        { label: "Open", href: "/results?view=cards", kind: "open" },
        { label: "Print/PDF", href: "/results?view=cards", kind: "print" }
      ]
    },
    {
      title: "Fee Ledger",
      description: "Student fee accounts, collection status, receipts, and fee filters.",
      area: "Finance",
      icon: Receipt,
      permission: "finance:view",
      formats: ["CSV", "Print/PDF", "Screen"],
      ownerOnly: true,
      actions: [
        { label: "Open", href: `/finance/challans?month=${month}`, kind: "open" },
        { label: "CSV", href: `/finance/challans?month=${month}`, kind: "csv" },
        { label: "Print/PDF", href: `/finance/challans?month=${month}`, kind: "print" }
      ]
    },
    {
      title: "Fee Challans",
      description: "Monthly fee challan list and payment status by student.",
      area: "Finance",
      icon: FileText,
      permission: "finance:view",
      formats: ["Print/PDF", "Screen"],
      actions: [
        { label: "Open", href: `/finance/challans?month=${month}`, kind: "open" },
        { label: "Print/PDF", href: `/finance/challans?month=${month}`, kind: "print" }
      ]
    },
    {
      title: "Transaction Ledger",
      description: "Income, expenses, student-fee payments, payroll expenses, and manual entries.",
      area: "Finance",
      icon: Banknote,
      permission: "finance:view",
      formats: ["Screen"],
      ownerOnly: true,
      actions: [
        { label: "Open", href: "/finance/transactions", kind: "open" }
      ]
    },
    {
      title: "Staff Pay Report",
      description: "Monthly staff pay with base salary, bonus, deduction, net salary, and paid status.",
      area: "Finance",
      icon: Banknote,
      permission: "payroll:view",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: `/finance/payroll?month=${month}`, kind: "open" }
      ]
    },
    {
      title: "Staff Directory",
      description: "Teacher, staff, role, department, and profile records.",
      area: "People",
      icon: Users,
      permission: "staff:view",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: "/staff", kind: "open" }
      ]
    },
    {
      title: "Leave Requests",
      description: "Staff leave requests by month, year, lifetime, or custom date range.",
      area: "Employee",
      icon: CalendarCheck,
      permission: "leave:view",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: "/leave", kind: "open" }
      ]
    },
    {
      title: "Transport Roster",
      description: "Vehicles, routes, drivers, fares, seat capacity, and assigned students.",
      area: "Transport",
      icon: Bus,
      permission: "transport:view",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: "/transport", kind: "open" }
      ]
    },
    {
      title: "Activity Logs",
      description: "Audit trail for important actions, entities, timestamps, and users.",
      area: "Audit",
      icon: Activity,
      permission: "activity:view",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: "/activity", kind: "open" }
      ]
    },
    {
      title: "Academic Setup Report",
      description: "Classes, subjects, sections, academic years, and subject assignments.",
      area: "Academics",
      icon: Settings,
      permission: "academics:view",
      formats: ["Screen"],
      actions: [
        { label: "Open", href: "/academics", kind: "open" }
      ]
    }
  ];
}

function canSeeReport(user: Awaited<ReturnType<typeof requireUser>>, report: ReportItem) {
  if (!hasPermission(user.role, report.permission, user.permissions)) return false;
  if (report.ownerOnly && user.role === "administrator") return false;
  return true;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const user = await requireUser("reports:view");
  const params = await searchParams;
  const month = currentMonthKey();
  const reports = reportCatalog(month, todayKey()).filter((report) => canSeeReport(user, report));
  const areas = Array.from(new Set(reports.map((report) => report.area)));
  const selectedArea = areas.includes(params.area ?? "") ? params.area! : "all";
  const visibleReports = selectedArea === "all" ? reports : reports.filter((report) => report.area === selectedArea);

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Report Center"
        description="Generate quick reports from one place without loading large registers into this page."
      />

      <div className="scrollbar-none -mx-4 mb-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Report categories">
        <nav className="flex min-w-max gap-2" aria-label="Filter reports by category">
          {["all", ...areas].map((area) => {
            const active = selectedArea === area;
            const label = area === "all" ? "All reports" : area;
            return <Link
              key={area}
              href={area === "all" ? "/reports" : `/reports?area=${encodeURIComponent(area)}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition",
                active ? "border-primary bg-primary text-white shadow-sm" : "border-outline bg-white text-muted hover:border-primary/40 hover:text-primary"
              )}
            >{label}</Link>;
          })}
        </nav>
      </div>

      <p className="mb-4 text-sm font-medium text-muted">Showing {visibleReports.length} report{visibleReports.length === 1 ? "" : "s"}</p>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
        {visibleReports.map((report) => <ReportCard key={report.title} report={report} />)}
      </section>
    </>
  );
}

function ReportCard({ report }: { report: ReportItem }) {
  const Icon = report.icon;
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <Badge>{report.area}</Badge>
          <h2 className="mt-3 break-words font-display text-lg font-bold leading-snug text-ink">{report.title}</h2>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm leading-6 text-muted">{report.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Available formats">
        {report.formats.map((format) => (
          <span key={format} className="rounded-md bg-surface-low px-2 py-1 text-xs font-semibold text-muted ring-1 ring-outline/60">
            {format}
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-2 border-t border-outline/60 pt-4 min-[420px]:flex min-[420px]:flex-wrap">
        {report.actions.map((action) => (
          <ButtonLink key={`${report.title}-${action.label}`} href={action.href} variant={action.kind === "open" ? "secondary" : "primary"} size="sm" target={action.external ? "_blank" : undefined} className="w-full justify-center min-[420px]:w-auto">
            {action.kind === "csv" ? <Download className="h-4 w-4" aria-hidden="true" /> : action.kind === "print" ? <Printer className="h-4 w-4" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
            {action.label}
          </ButtonLink>
        ))}
      </div>
    </Card>
  );
}
