"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Coins, GraduationCap, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

const screens = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, title: "Your school day, at a glance", description: "Bring daily priorities and financial insights into one clear view." },
  { id: "students", label: "Students", icon: GraduationCap, title: "Every student. One organized record.", description: "Keep admissions, classes, and guardian details within easy reach." },
  { id: "staff", label: "Staff", icon: Users, title: "A connected team starts here", description: "See staff roles, class assignments, and contact details in one directory." },
  { id: "results", label: "Results", icon: BarChart3, title: "A clearer path from marks to results", description: "Follow exam submissions from review through approval." },
  { id: "fees", label: "Fees", icon: Coins, title: "Know where every payment stands", description: "Keep billing, collections, and outstanding balances easy to follow." },
] as const;

// Fixed fictional records keep the public demo consistent and independent of school data.
const students = [
  ["Zoya Malik", "Naveed Malik", "Grade 8 · A", "DEMO-001", "Active"],
  ["Rayan Siddiq", "Farooq Siddiq", "Grade 9 · A", "DEMO-002", "Active"],
  ["Hiba Qureshi", "Imran Qureshi", "Grade 10 · B", "DEMO-003", "Active"],
  ["Daniyal Rauf", "Kashif Rauf", "Grade 9 · B", "DEMO-004", "Active"],
];

export function ProductPreview() {
  const [selected, setSelected] = useState<(typeof screens)[number]["id"]>("overview");
  const screen = screens.find((item) => item.id === selected)!;
  return (
    <section aria-label="Explore the product" className="relative mx-auto mt-14 max-w-6xl text-left">
      <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-r from-blue-100/60 via-cyan-50 to-slate-100 blur-2xl" />
      <div className="mb-5 flex flex-wrap justify-center gap-2" aria-label="Choose a product preview">
        {screens.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={selected === id} aria-controls="product-preview-screen" onClick={() => setSelected(id)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${selected === id ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-xs font-bold text-slate-600">Darsgah <span className="font-normal text-slate-400">/ Product tour</span></span>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700">Sample data · Fictional school</span>
        </div>
        <div id="product-preview-screen" role="region" aria-label={`${screen.label} preview`} className="min-h-[520px] bg-slate-50/60 p-4 sm:p-7">
          {selected === "overview" ? <Dashboard /> : <RecordsScreen selected={selected} />}
        </div>
        <div className="flex flex-col justify-between gap-5 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:p-7">
          <div aria-live="polite"><h2 className="text-lg font-bold tracking-tight text-slate-900">{screen.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{screen.description}</p></div>
          <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800">See it in a personal demo <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">Illustrative product previews. All names, records, and figures are fictional.</p>
    </section>
  );
}

function Metrics({ items }: { items: [string, string, string][] }) {
  const colors = ["border-t-blue-500", "border-t-purple-500", "border-t-emerald-500", "border-t-rose-500"];
  return <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{items.map(([label, value, detail], index) => <div key={label} className={`rounded-2xl border border-slate-200 border-t-[3px] bg-white p-4 ${colors[index % colors.length]}`}><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">{detail}</p></div>)}</div>;
}

function Dashboard() {
  return <>
    <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white"><p className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">Today</p><h3 className="mt-1 text-lg font-bold">Daily Operations</h3><div className="mt-4 flex flex-wrap gap-2">{["Classes marked: 24", "Leave requests: 2", "Student approvals: 5", "Result approvals: 3"].map((item) => <span key={item} className="rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-blue-800">{item}</span>)}</div></div>
    <Metrics items={[["Total students", "864", "456 boys · 408 girls"], ["Staff", "62", "48 teachers"], ["Total income", "Rs 8.4M", "This academic year"], ["Total expenses", "Rs 6.3M", "Balance: Rs 2.1M"]]} />
    <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><h4 className="text-sm font-bold">Income Trend</h4><p className="mt-1 text-[10px] text-slate-500">Monthly collections · Rs millions</p><svg viewBox="0 0 440 155" role="img" aria-label="Sample monthly income rises from 1 million in April to 1.8 million in September" className="mt-4 w-full"><path d="M30 25H425 M30 70H425 M30 115H425" stroke="#e2e8f0" fill="none" /><path d="M30 110 L109 91 L188 98 L267 61 L346 49 L425 22 L425 125 L30 125Z" fill="#eff6ff" /><path d="M30 110 L109 91 L188 98 L267 61 L346 49 L425 22" stroke="#2563eb" strokeWidth="3" fill="none" />{["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((month, index) => <text key={month} x={30 + index * 79} y="148" textAnchor="middle" fontSize="10" fill="#64748b">{month}</text>)}</svg></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><h4 className="text-sm font-bold">Expense Distribution</h4><div className="mx-auto my-4 flex h-32 w-32 items-center justify-center rounded-full" style={{ background: "conic-gradient(#2563eb 0% 75%, #10b981 75% 90%, #f59e0b 90% 100%)" }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><span className="text-[9px] text-slate-500">Total expense</span><strong className="mt-1 text-sm">Rs 6.3M</strong></div></div><p className="text-center text-[10px] leading-5 text-slate-600">Staff 75% · Facilities 15% · Other 10%</p></div>
    </div>
  </>;
}

function RecordsScreen({ selected }: { selected: "students" | "staff" | "results" | "fees" }) {
  const content: Record<typeof selected, { eyebrow: string; title: string; icon: LucideIcon; metrics: [string, string, string][] }> = {
    students: { eyebrow: "People", title: "Student Management", icon: GraduationCap, metrics: [["Total students", "864", "School records"], ["Active students", "852", "Currently enrolled"], ["New admissions", "28", "This month"], ["Withdrawn", "12", "This academic year"]] },
    staff: { eyebrow: "School directory", title: "Staff", icon: Users, metrics: [["Total staff", "62", "Across all departments"], ["Active staff", "60", "Active directory"], ["Teachers", "48", "Teaching team"], ["Account staff", "54", "With app login access"]] },
    results: { eyebrow: "Results management", title: "Exam & Result Approvals", icon: BarChart3, metrics: [["Results", "48", "Result register"], ["Approved", "44", "Ready for use"], ["Pending", "3", "Awaiting review"], ["Returned", "1", "Needs revision"]] },
    fees: { eyebrow: "Finance", title: "Fee Management", icon: Coins, metrics: [["Expected billing", "Rs 960,000", "Total payable"], ["Collected", "Rs 816,000", "Payments received"], ["Outstanding", "Rs 144,000", "Pending collection"], ["Discounts", "Rs 24,000", "Approved adjustments"]] },
  };
  const { eyebrow, title, icon: Icon, metrics } = content[selected];
  return <>
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p><h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h3>
    <Metrics items={metrics} />
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Icon className="h-4 w-4 text-blue-600" /><h4 className="text-sm font-bold">{selected === "students" ? "Students List" : selected === "staff" ? "Staff List" : selected === "results" ? "Result Register" : "Student Fee Accounts"}</h4><span className="ml-auto text-[10px] text-slate-500">Sample records</span></div>
      {selected === "staff" ? <div className="space-y-3 p-4">{[["Sana Farooqi", "Librarian", "sana.farooqi@example.com", "Library"], ["Omar Saeed", "Teacher", "omar.saeed@example.com", "3 assigned classes"], ["Mariam Bashir", "Teacher", "mariam.bashir@example.com", "2 assigned classes"]].map(([name, role, email, classes]) => <div key={name} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">{name.split(" ").map((part) => part[0]).join("")}</span><div><p className="text-sm font-bold">{name}</p><p className="mt-1 text-[10px] font-semibold text-blue-600">{role} · Active</p><p className="mt-1 break-all text-[11px] text-slate-500">{email}</p></div><span className="ml-auto text-[10px] text-slate-500">{classes}</span></div>)}</div> : selected === "students" ? <RecordTable headers={["Student", "Guardian", "Class", "Admission no.", "Status"]} rows={students} /> : selected === "results" ? <RecordTable headers={["Exam", "Subject", "Class", "Uploaded by", "Status"]} rows={[["Monthly Test", "Mathematics", "Grade 8 · A", "Omar Saeed", "Approved"], ["Midterm", "English", "Grade 9 · A", "Mariam Bashir", "Pending"], ["Monthly Test", "Science", "Grade 10 · B", "Bilal Tariq", "Approved"], ["Midterm", "Urdu", "Grade 9 · B", "Nida Saleem", "Returned"]]} /> : <RecordTable headers={["Student", "Class", "Payable", "Paid", "Remaining", "Status"]} rows={[["Zoya Malik", "Grade 8 · A", "Rs 12,000", "Rs 12,000", "Rs 0", "Paid"], ["Rayan Siddiq", "Grade 9 · A", "Rs 14,000", "Rs 10,000", "Rs 4,000", "Pending"], ["Hiba Qureshi", "Grade 10 · B", "Rs 16,000", "Rs 16,000", "Rs 0", "Paid"], ["Daniyal Rauf", "Grade 9 · B", "Rs 14,000", "Rs 7,000", "Rs 7,000", "Pending"]]} />}
    </div>
  </>;
}

function RecordTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto focus-visible:outline focus-visible:outline-blue-600" tabIndex={0} role="region" aria-label="Sample records; scroll horizontally to see all columns"><table className="w-full min-w-[640px] text-left text-xs"><thead className="bg-blue-50/60"><tr>{headers.map((header) => <th key={header} scope="col" className="px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-slate-100">{row.map((cell, column) => <td key={column} className={`px-5 py-5 ${column === 0 ? "font-semibold text-slate-900" : "text-slate-600"}`}>{column === row.length - 1 ? <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${cell === "Pending" ? "bg-amber-50 text-amber-700" : cell === "Returned" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div>;
}
