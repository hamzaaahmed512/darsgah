function MaleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><circle cx="9" cy="15" r="4.5" /><path d="m12.2 11.8 7.3-7.3M14.8 4.5h4.7v4.7" /></svg>;
}

function FemaleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="8.5" r="4.5" /><path d="M12 13v8M8.5 18h7" /></svg>;
}

export function GenderCounts({ male, female, compact = false }: { male: number; female: number; compact?: boolean }) {
  if (compact) {
    return <div className="flex items-center gap-4"><span title="Male students" aria-label="Male students" className="inline-flex items-center gap-1.5 font-bold text-blue-700"><MaleIcon />{male}</span><span title="Female students" aria-label="Female students" className="inline-flex items-center gap-1.5 font-bold text-rose-600"><FemaleIcon />{female}</span></div>;
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3 lg:w-auto">
      <div aria-label={`${male} male students`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 shadow-sm sm:min-w-40">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><MaleIcon /></span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-muted">Male</span>
          <span className="block text-xl font-bold leading-tight text-ink">{male.toLocaleString()}</span>
        </span>
      </div>
      <div aria-label={`${female} female students`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-rose-100 bg-white/90 px-4 py-3 shadow-sm sm:min-w-40">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><FemaleIcon /></span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-muted">Female</span>
          <span className="block text-xl font-bold leading-tight text-ink">{female.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}
