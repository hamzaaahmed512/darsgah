import { Children, cloneElement, forwardRef, isValidElement, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  required,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const child = Children.count(children) === 1 && isValidElement(children) ? children as ReactElement<{ required?: boolean; "aria-required"?: boolean | "true" | "false" }> : null;
  const isRequired = required ?? Boolean(child?.props.required || child?.props["aria-required"] === true || child?.props["aria-required"] === "true");
  const control = child && isRequired && child.props["aria-required"] === undefined
    ? cloneElement(child, { "aria-required": true })
    : children;

  return (
    <label className="grid gap-2.5 text-sm font-semibold text-ink">
      <span>
        {label}
        {isRequired ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </span>
      {control}
      {hint ? <span className="text-xs font-medium leading-5 text-muted">{hint}</span> : null}
      {error ? <span className="text-sm font-medium text-danger">{error}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  const isDateInput = props.type === "date";

  return (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-xl border border-outline bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-sm placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-surface-low disabled:text-muted",
        isDateInput &&
          "pr-10 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70",
        className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-xl border border-outline bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-surface-low disabled:text-muted",
        className
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-xl border border-outline bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-surface-low disabled:text-muted",
        className
      )}
      {...props}
    />
  );
});
