"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Download, FileText, Mail, MapPin, Phone, TrendingUp, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatGradeSection } from "@/lib/utils";
import { formatDisplayName } from "@/lib/student-name";

type Tab = "bio" | "attendance" | "marks" | "fees";
type Props = {
  student: any;
  guardians: any[];
  attendance: any[];
  marks: any[];
  challans: any[];
  limitedView: boolean;
  canViewFinance: boolean;
};

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });
const tabs: { id: Tab; label: string }[] = [
  { id: "bio", label: "Bio Data" },
  { id: "attendance", label: "Attendance" },
  { id: "marks", label: "Marks & Exam History" },
  { id: "fees", label: "Fee & Challan History" }
];

export function StudentProfileTabs(props: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedTab = searchParams.get("tab") as Tab | null;
  const availableTabs = tabs.filter((tab) => tab.id !== "fees" || props.canViewFinance);
  const activeTab = availableTabs.some((tab) => tab.id === requestedTab) ? requestedTab! : "bio";

  function selectTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="mt-6">
      <div className="scrollbar-thin overflow-x-auto border-b border-outline" role="tablist" aria-label="Student profile sections">
        <div className="flex min-w-max gap-1">
          {availableTabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => selectTab(tab.id)}
              className={cn("relative min-h-12 whitespace-nowrap rounded-t-xl px-4 text-sm font-semibold text-muted hover:bg-surface-low hover:text-ink", activeTab === tab.id && "bg-primary-soft text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary")}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-6" role="tabpanel">
        {activeTab === "bio" ? <BioTab {...props} /> : null}
        {activeTab === "attendance" ? <AttendanceTab rows={props.attendance} /> : null}
        {activeTab === "marks" ? <MarksTab rows={props.marks} /> : null}
        {activeTab === "fees" && props.canViewFinance ? <FeesTab rows={props.challans} /> : null}
      </div>
    </section>
  );
}

function BioTab({ student, guardians, limitedView }: Props) {
  const classAssignment = formatGradeSection(student.grade_name, student.section_name) || student.class_name || "Unassigned";
  return <div className="grid gap-5 lg:grid-cols-2">
    <DetailCard title="Personal & academic" icon={<FileText className="h-5 w-5" />}>
      <DetailsGrid items={[
        ["Gender", student.gender], ["Date of birth", limitedView ? "Restricted" : student.date_of_birth],
        ["Religion", limitedView ? "Restricted" : student.religion],
        ["Admission date", student.admission_date], ["Class assignment", classAssignment],
        ...(!limitedView ? [["Father alive", student.father_alive === false ? "No" : "Yes"]] : [])
      ]} />
    </DetailCard>
    {!limitedView ? <DetailCard title="Contact details" icon={<Phone className="h-5 w-5" />}>
      <DetailsGrid items={[["Phone", student.phone], ["Email", student.email], ["Home / permanent address", student.address]]} />
    </DetailCard> : null}
    {!limitedView ? <Card className="lg:col-span-2"><CardHeader className="border-b border-outline/70"><div><CardTitle>Guardians</CardTitle><p className="mt-1 text-sm text-muted">Primary family contact information.</p></div></CardHeader><CardContent className="grid gap-4 pt-6 md:grid-cols-2">
      {guardians.length ? guardians.map((guardian) => <div key={guardian.guardian_id} className="rounded-2xl border border-outline bg-surface-low p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{formatDisplayName(guardian.full_name)}</p><p className="text-sm text-muted">{guardian.relationship || "Guardian"}</p></div>{guardian.is_primary ? <Badge tone="blue">Primary</Badge> : null}</div>
        <div className="mt-4 space-y-2 text-sm text-muted"><p className="flex items-center gap-2"><Phone className="h-4 w-4" />{guardian.phone || "Not recorded"}</p><p className="flex items-center gap-2"><Mail className="h-4 w-4" />{guardian.email || "Not recorded"}</p></div>
      </div>) : <EmptyState title="No guardian recorded" description="Guardian details will appear here." className="min-h-44 md:col-span-2" />}
    </CardContent></Card> : null}
  </div>;
}

function AttendanceTab({ rows }: { rows: any[] }) {
  const [preset, setPreset] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [status, setStatus] = useState("all");
  const filtered = useMemo(() => rows.filter((row) => {
    const day = new Date(`${row.attendance_date}T00:00:00`); const now = new Date();
    const presetStart = new Date(now);
    if (preset === "weekly") presetStart.setDate(now.getDate() - 7);
    if (preset === "monthly") presetStart.setMonth(now.getMonth() - 1);
    if (preset === "yearly") presetStart.setFullYear(now.getFullYear() - 1);
    return (preset === "all" || day >= presetStart) && (!from || row.attendance_date >= from) && (!to || row.attendance_date <= to) && (status === "all" || row.status === status);
  }), [rows, preset, from, to, status]);
  const distribution = ["present", "absent", "excused", "late"].map((name) => ({ name: labelize(name), value: filtered.filter((row) => row.status === name).length }));
  const trend = useMemo(() => {
    const buckets = new Map<string, { label: string; present: number; absent: number; excused: number; late: number }>();
    [...filtered].reverse().forEach((row) => { const date = new Date(`${row.attendance_date}T00:00:00`); const key = `${date.getFullYear()}-${date.getMonth()}`; const value = buckets.get(key) ?? { label: date.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }), present: 0, absent: 0, excused: 0, late: 0 }; value[row.status as "present"] = (value[row.status as "present"] || 0) + 1; buckets.set(key, value); });
    return [...buckets.values()].slice(-8);
  }, [filtered]);
  const colors = ["#22c55e", "#ef4444", "#f59e0b", "#eab308"];
  return <div className="space-y-5"><FilterCard><Select label="Preset" value={preset} onChange={setPreset} options={[["all","All Time"],["yearly","Yearly"],["monthly","Monthly"],["weekly","Weekly"]]} /><DateField label="From date" value={from} onChange={setFrom} /><DateField label="To date" value={to} onChange={setTo} /><Select label="Status" value={status} onChange={setStatus} options={[["all","All"],["present","Present"],["absent","Absent"],["excused","Excused"],["late","Late"]]} /><button type="button" className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white" onClick={() => { setFrom(from); setTo(to); }}>Apply</button></FilterCard>
    <div className="grid gap-5 xl:grid-cols-2"><ChartCard title="Attendance percentage" description={`${filtered.length} attendance records in this view`}><div className="h-64"><ResponsiveContainer><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>{distribution.map((_, i) => <Cell key={i} fill={colors[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="flex flex-wrap justify-center gap-4">{distribution.map((item, i) => <span key={item.name} className="flex items-center gap-2 text-xs font-medium text-muted"><i className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />{item.name}: {item.value}</span>)}</div></ChartCard>
    <ChartCard title="Attendance trend" description="Monthly status breakdown"><div className="h-72"><ResponsiveContainer><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="present" stackId="a" fill="#22c55e" /><Bar dataKey="late" stackId="a" fill="#eab308" /><Bar dataKey="excused" stackId="a" fill="#f59e0b" /><Bar dataKey="absent" stackId="a" fill="#ef4444" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></ChartCard></div>
    <DataCard title="Attendance records"><HistoryTable headers={["Date","Class","Status","Note"]} rows={filtered.map((row) => [formatDate(row.attendance_date), formatGradeSection(row.classes?.grades?.name, row.classes?.sections?.name) || row.classes?.name || "—", <StatusBadge key="s" status={row.status} />, row.note || "—"])} empty="No attendance records match these filters." /></DataCard></div>;
}

function MarksTab({ rows }: { rows: any[] }) {
  const years = unique(rows.map((r) => r.exams?.exam_date?.slice(0,4)).filter(Boolean)); const terms = unique(rows.map((r) => r.exams?.term).filter(Boolean)); const subjects = unique(rows.map((r) => r.subjects?.name).filter(Boolean));
  const [year,setYear]=useState("all"), [term,setTerm]=useState("all"), [subject,setSubject]=useState("all");
  const filtered=rows.filter((r)=>(year==="all"||r.exams?.exam_date?.startsWith(year))&&(term==="all"||r.exams?.term===term)&&(subject==="all"||r.subjects?.name===subject));
  const percentages=filtered.map((r)=>Number(r.exams?.max_marks)?Number(r.marks_obtained)/Number(r.exams.max_marks)*100:null).filter((v):v is number=>v!==null); const average=percentages.length?percentages.reduce((a,b)=>a+b,0)/percentages.length:null;
  return <div className="space-y-5"><FilterCard><Select label="Academic year / session" value={year} onChange={setYear} options={[["all","All sessions"],...years.map(v=>[v,v])]} /><Select label="Term" value={term} onChange={setTerm} options={[["all","All terms"],...terms.map(v=>[v,v])]} /><Select label="Subject" value={subject} onChange={setSubject} options={[["all","All subjects"],...subjects.map(v=>[v,v])]} /></FilterCard>
    <div className="rounded-[18px] border border-primary/15 bg-gradient-to-r from-primary-soft to-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-primary">Selected result average</p><div className="mt-2 flex items-end gap-3"><p className="font-display text-4xl font-bold text-ink">{average===null?"No data":`${Math.round(average)}%`}</p>{average!==null?<Badge tone={average>=80?"green":average>=60?"blue":"yellow"}>{gradeFor(average)}</Badge>:null}</div><p className="mt-2 text-sm text-muted">Calculated from {filtered.length} subject result{filtered.length===1?"":"s"}.</p></div>
    <DataCard title="Marks & exam history"><HistoryTable headers={["Exam name","Term","Subject","Marks obtained","Grade","Approval status","Teacher comments"]} rows={filtered.map((r)=>[r.exams?.title||"—",r.exams?.term||"—",r.subjects?.name||"—",`${r.marks_obtained}/${r.exams?.max_marks??"—"}`,r.grade||"—",<StatusBadge key="s" status={r.exams?.approval_status||r.status}/>,r.teacher_comment||"—"])} empty="No exam results match these filters." /></DataCard></div>;
}

function FeesTab({ rows }: { rows: any[] }) {
  const periods=unique(rows.map((r)=>r.fee_month?.slice(0,7)).filter(Boolean)); const [status,setStatus]=useState("all"),[period,setPeriod]=useState("all");
  const normalized=(r:any)=>r.payment_status==="partially paid"?"partial":r.payment_status;
  const filtered=rows.filter((r)=>(status==="all"||normalized(r)===status)&&(period==="all"||r.fee_month?.startsWith(period))); const outstanding=filtered.reduce((sum,r)=>sum+Number(r.outstanding),0); const overdue=filtered.filter((r)=>r.outstanding>0&&new Date(r.due_date)<new Date()).length;
  return <div className="space-y-5"><FilterCard><Select label="Challan status" value={status} onChange={setStatus} options={[["all","All"],["unpaid","Unpaid"],["paid","Paid"],["overdue","Overdue"],["partial","Partial"]]} /><Select label="Fiscal year / month" value={period} onChange={setPeriod} options={[["all","All periods"],...periods.map(v=>[v,v])]} /></FilterCard>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-[18px] border border-danger/15 bg-danger-soft p-5"><WalletCards className="h-5 w-5 text-danger"/><p className="mt-3 text-sm font-semibold text-danger">Total outstanding balance</p><p className="mt-1 font-display text-3xl font-bold text-ink">{money.format(outstanding)}</p></div><div className="rounded-[18px] border border-warning/20 bg-warning-soft p-5"><CalendarDays className="h-5 w-5 text-warning"/><p className="mt-3 text-sm font-semibold text-warning">Overdue challans</p><p className="mt-1 font-display text-3xl font-bold text-ink">{overdue}</p></div></div>
    <DataCard title="Fee & challan history"><HistoryTable headers={["Month / session","Challan amount","Due date","Generated date","Outstanding amount","Status","Actions"]} rows={filtered.map((r)=>[r.fee_month,money.format(Number(r.amount)),formatDate(r.due_date),formatDate(r.created_at),money.format(Number(r.outstanding)),<StatusBadge key="s" status={normalized(r)}/>,<div key="a" className="flex min-w-max gap-2"><Link href="/finance/challans" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Download className="h-3.5 w-3.5"/>View / PDF</Link>{r.outstanding>0?<Link href="/finance/fees" className="font-semibold text-success hover:underline">Mark as paid</Link>:null}</div>])} empty="No fee challans match these filters." /></DataCard></div>;
}

function DetailCard({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <Card><CardHeader className="border-b border-outline/70"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary-soft p-2 text-primary">{icon}</span><CardTitle>{title}</CardTitle></div></CardHeader><CardContent className="pt-6">{children}</CardContent></Card>}
function DetailsGrid({items}:{items:any[][]}){return <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{items.map(([label,value])=><div key={label} className={label.includes("address")?"sm:col-span-2":""}><dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1.5 flex items-start gap-2 font-medium text-ink">{label.includes("address")?<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted"/>:null}{value||"Not recorded"}</dd></div>)}</dl>}
function FilterCard({children}:{children:React.ReactNode}){return <div className="flex flex-col gap-3 rounded-[18px] border border-outline bg-surface-low p-4 sm:flex-row sm:flex-wrap sm:items-end">{children}</div>}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[][]}){return <label className="grid min-w-44 flex-1 gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">{label}<select value={value} onChange={(e)=>onChange(e.target.value)} className="min-h-10 rounded-xl border border-outline bg-white px-3 text-sm font-medium normal-case tracking-normal text-ink"><>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</></select></label>}
function DateField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="grid min-w-40 flex-1 gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">{label}<input type="date" value={value} onChange={(e)=>onChange(e.target.value)} className="min-h-10 rounded-xl border border-outline bg-white px-3 text-sm font-medium text-ink"/></label>}
function ChartCard({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <Card><CardHeader><div><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary"/>{title}</CardTitle><p className="mt-1 text-sm text-muted">{description}</p></div></CardHeader><CardContent>{children}</CardContent></Card>}
function DataCard({title,children}:{title:string;children:React.ReactNode}){return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>}
function HistoryTable({headers,rows,empty}:{headers:string[];rows:React.ReactNode[][];empty:string}){if(!rows.length)return <EmptyState title="Nothing to show" description={empty} className="min-h-44"/>;return <div className="scrollbar-thin overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{headers.map(h=><th key={h} className="whitespace-nowrap px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted first:pl-0">{h}</th>)}</tr></thead><tbody>{rows.map((cells,i)=><tr key={i} className="border-t border-outline/70 hover:bg-surface-low">{cells.map((cell,j)=><td key={j} className="max-w-xs px-3 py-3.5 align-top text-ink first:pl-0">{cell}</td>)}</tr>)}</tbody></table></div>}
function StatusBadge({status}:{status:string}){const s=(status||"").toLowerCase();const tone=s==="present"||s==="paid"||s==="approved"?"green":s==="absent"||s==="unpaid"||s==="overdue"?"red":s==="late"||s==="excused"||s==="partial"||s==="pending"?"yellow":"gray";return <Badge tone={tone}>{labelize(s||"unknown")}</Badge>}
function unique(values:string[]){return [...new Set(values)]} function labelize(value:string){return value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())} function formatDate(value:string){if(!value)return "—";return new Date(value.length===10?`${value}T00:00:00`:value).toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"})} function gradeFor(v:number){return v>=90?"A+":v>=80?"A":v>=70?"B":v>=60?"C":v>=50?"D":"F"}
