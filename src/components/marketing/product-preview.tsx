import { Bell, BookOpen, CalendarCheck, CheckCircle2, GraduationCap, LayoutDashboard, Users } from "lucide-react";

export function ProductPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-6xl">
      <div className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-r from-blue-100/60 via-cyan-50 to-slate-100 blur-2xl" />
      <div className="marketing-card overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)]">
        <div className="flex h-10 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="mx-auto rounded-md border border-slate-200 bg-white px-12 py-1 text-[9px] text-slate-400 sm:px-24">app.getdarsgah.com</span>
        </div>
        <div className="grid min-h-[430px] grid-cols-[72px_1fr] sm:grid-cols-[190px_1fr]">
          <aside className="border-r border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-8 flex items-center gap-2 px-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white"><BookOpen className="h-4 w-4" /></span>
              <span className="hidden text-sm font-bold text-ink sm:block">Darsgah</span>
            </div>
            <PreviewNav icon={LayoutDashboard} label="Overview" active />
            <PreviewNav icon={GraduationCap} label="Students" />
            <PreviewNav icon={CalendarCheck} label="Attendance" />
            <PreviewNav icon={Users} label="Staff" />
          </aside>
          <div className="min-w-0 bg-slate-50/70">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
              <div><p className="text-[10px] text-muted">Good morning</p><p className="text-xs font-bold text-ink sm:text-sm">School overview</p></div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"><Bell className="h-3.5 w-3.5 text-muted" /></span>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric label="Total students" value="1,248" detail="+32 this term" />
                <Metric label="Present today" value="94.6%" detail="1,181 students" />
                <Metric label="Teaching staff" value="76" detail="8 departments" />
                <Metric label="Pending actions" value="12" detail="Needs review" accent />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between"><p className="text-xs font-bold text-ink">Weekly attendance</p><span className="text-[9px] text-muted">This week</span></div>
                  <div className="mt-6 flex h-32 items-end gap-3 sm:gap-5">
                    {[68, 78, 64, 88, 82].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full max-w-10 rounded-t bg-blue-100" style={{ height }}><div className="w-full rounded-t bg-primary" style={{ height: `${height - 12}px` }} /></div><span className="text-[8px] text-muted">{["Mon", "Tue", "Wed", "Thu", "Fri"][index]}</span></div>)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-ink">Recent activity</p>
                  <div className="mt-4 space-y-4">
                    <Activity text="Attendance marked" meta="Grade 8 · 4 min ago" />
                    <Activity text="Fee payment received" meta="INV-2048 · 18 min ago" />
                    <Activity text="Results approved" meta="Term exams · 1 hr ago" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewNav({ icon: Icon, label, active = false }: { icon: typeof LayoutDashboard; label: string; active?: boolean }) {
  return <div className={`mb-1 flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[10px] font-semibold sm:justify-start ${active ? "bg-primary text-white" : "text-muted"}`}><Icon className="h-4 w-4" /><span className="hidden sm:block">{label}</span></div>;
}
function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"><p className="truncate text-[9px] text-muted">{label}</p><p className="mt-1 text-lg font-bold tracking-tight text-ink sm:text-xl">{value}</p><p className={`mt-2 truncate text-[8px] ${accent ? "text-amber-600" : "text-muted"}`}>{detail}</p></div>;
}
function Activity({ text, meta }: { text: string; meta: string }) {
  return <div className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-3 w-3" /></span><div><p className="text-[9px] font-semibold text-ink sm:text-[10px]">{text}</p><p className="mt-0.5 text-[8px] text-muted">{meta}</p></div></div>;
}
