import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-button">
            <BookOpen aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-tight tracking-tight text-ink">Darsgah</p>
            <p className="font-label text-xs font-semibold uppercase tracking-wider text-muted">Secure school management</p>
          </div>
        </div>
        <div className="card-surface rounded-[20px] p-8">{children}</div>
      </div>
    </main>
  );
}
