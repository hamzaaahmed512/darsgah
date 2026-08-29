import type { LucideIcon } from "lucide-react";
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
        { label: "Open", href: `/finance/fees?month=${month}`, kind: "open" },
        { label: "CSV", href: `/finance/fees?month=${month}`, kind: "csv" },
        { label: "Print/PDF", href: `/finance/fees?month=${month}`, kind: "print" }
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
        { label: "Open", href: `/finance/fees?month=${month}`, kind: "open" },
        { label: "Print/PDF", href: `/finance/fees?month=${month}`, kind: "print" }
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

export default async function ReportsPage() {
  const user = await requireUser("reports:view");
  const month = currentMonthKey();
  const reports = reportCatalog(month, todayKey()).filter((report) => canSeeReport(user, report));
  const areas = Array.from(new Set(reports.map((report) => report.area)));

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Report Center"
        description="Generate quick reports from one place without loading large registers into this page."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {areas.map((area) => (
          <Badge key={area} tone="blue">{area}</Badge>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(260px,1.35fr)_180px_190px_260px] gap-4 border-b border-outline/70 bg-surface-low px-5 py-3 font-label text-xs uppercase tracking-wide text-muted lg:grid">
          <span>Report</span>
          <span>Area</span>
          <span>Formats</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-outline/70">
          {reports.map((report) => (
            <ReportRow key={report.title} report={report} />
          ))}
        </div>
      </Card>
    </>
  );
}

function ReportRow({ report }: { report: ReportItem }) {
  const Icon = report.icon;
  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(260px,1.35fr)_180px_190px_260px] lg:items-center">
      <div className="flex min-w-0 gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-ink">{report.title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{report.description}</p>
        </div>
      </div>
      <div>
        <Badge>{report.area}</Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {report.formats.map((format) => (
          <span key={format} className="rounded-md bg-surface-low px-2 py-1 text-xs font-semibold text-muted ring-1 ring-outline/60">
            {format}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
        {report.actions.map((action) => (
          <ButtonLink key={`${report.title}-${action.label}`} href={action.href} variant={action.kind === "open" ? "secondary" : "primary"} size="sm" target={action.external ? "_blank" : undefined}>
            {action.kind === "csv" ? <Download className="h-4 w-4" aria-hidden="true" /> : action.kind === "print" ? <Printer className="h-4 w-4" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
            {action.label}
          </ButtonLink>
        ))}
      </div>
    </div>
  );
}
