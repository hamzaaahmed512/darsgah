import type { ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions
}: {
  title: string | ReactNode;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="font-label text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
