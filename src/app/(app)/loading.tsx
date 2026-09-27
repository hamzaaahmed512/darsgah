export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="h-9 w-48 rounded-xl bg-slate-200 motion-safe:animate-pulse" />
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => <div key={key} className="h-32 rounded-2xl bg-slate-100 motion-safe:animate-pulse" />)}
      </div>
      <div aria-hidden="true" className="h-72 rounded-2xl bg-slate-100 motion-safe:animate-pulse" />
    </div>
  );
}
