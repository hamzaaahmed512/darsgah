import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-button hover:bg-primary-ink hover:shadow-lift disabled:bg-surface-high disabled:text-muted disabled:shadow-none",
  secondary: "bg-white text-ink ring-1 ring-outline hover:bg-surface-low hover:text-primary disabled:text-muted",
  ghost: "bg-transparent text-primary hover:bg-primary-soft disabled:text-outline",
  danger: "bg-danger text-white shadow-[0_10px_22px_rgba(239,68,68,0.16)] hover:bg-[#dc2626] disabled:bg-surface-high disabled:text-muted disabled:shadow-none"
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 sm:min-h-9 px-3.5 py-1.5 text-xs",
  md: "min-h-11 px-5 py-2.5 text-sm"
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        "relative inline-flex max-w-full whitespace-normal text-center [&>svg]:shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      className={cn(
        "relative inline-flex max-w-full whitespace-normal text-center [&>svg]:shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
