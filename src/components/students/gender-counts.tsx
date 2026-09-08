function MaleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><circle cx="9" cy="15" r="4.5" /><path d="m12.2 11.8 7.3-7.3M14.8 4.5h4.7v4.7" /></svg>;
}

function FemaleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="8.5" r="4.5" /><path d="M12 13v8M8.5 18h7" /></svg>;
}

export function GenderCounts({ male, female, compact = false }: { male: number; female: number; compact?: boolean }) {
  return <div className={`flex items-center gap-4 ${compact ? "" : "pl-7"}`}><span title="Male students" aria-label="Male students" className="inline-flex items-center gap-1.5 font-bold text-blue-700"><MaleIcon />{male}</span><span title="Female students" aria-label="Female students" className="inline-flex items-center gap-1.5 font-bold text-rose-600"><FemaleIcon />{female}</span></div>;
}
