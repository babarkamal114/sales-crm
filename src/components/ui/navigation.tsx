import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { navLinkClass, textLinkClass } from "@/lib/interactive-styles";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-2 text-[12px] font-semibold">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={item.label}>
              {index > 0 ? (
                <ChevronRight
                  className="size-3 text-ink-300"
                  strokeWidth={2.4}
                  aria-hidden
                />
              ) : null}
              <li>
                {item.href && !isLast ? (
                  <a href={item.href} className={cn(textLinkClass, "text-ink-400 hover:text-ink-700 hover:no-underline")}>
                    {item.label}
                  </a>
                ) : (
                  <span className={isLast ? "text-ink-700" : "text-ink-400"}>
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1.5", className)}>
      <PaginationButton
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        icon="prev"
      />
      {pages.map((page) => (
        <PaginationButton
          key={page}
          active={page === currentPage}
          onClick={() => onPageChange(page)}
        >
          {page}
        </PaginationButton>
      ))}
      <PaginationButton
        aria-label="Next page"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        icon="next"
      />
    </nav>
  );
}

function PaginationButton({
  active,
  children,
  icon,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon?: "prev" | "next";
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-full text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-ink-900 font-bold text-white"
          : "border border-line bg-white font-semibold text-ink-500 hover:text-ink-900",
        icon && "text-ink-400",
        className,
      )}
      {...props}
    >
      {icon === "prev" ? (
        <svg
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="m15 5-7 7 7 7" />
        </svg>
      ) : icon === "next" ? (
        <svg
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="m9 5 7 7-7 7" />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}

export interface NavItemProps {
  href: string;
  icon?: ReactNode;
  label: string;
  active?: boolean;
  count?: number | string;
  countTone?: "rose" | "amber" | "neutral" | "muted";
  locked?: boolean;
  className?: string;
}

const countToneStyles = {
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-700",
  neutral: "bg-white/20 text-white",
  muted: "bg-soft text-ink-500",
} as const;

function navItemClassName(active: boolean, className?: string) {
  return cn(
    navLinkClass,
    "flex items-center gap-3 px-3 py-2.5 text-[13px]",
    active
      ? "bg-brand-500 font-semibold text-white shadow-chip"
      : "font-medium text-ink-500 hover:bg-soft hover:text-ink-900",
    className,
  );
}

export function NavItem({
  href,
  icon,
  label,
  active = false,
  count,
  countTone = "neutral",
  locked = false,
  className,
}: NavItemProps) {
  const body = (
    <>
      {icon}
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            "ml-auto flex min-h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tnum",
            countToneStyles[
              active && countTone !== "muted" ? "neutral" : (countTone ?? "rose")
            ],
          )}
        >
          {count}
        </span>
      ) : locked ? (
        <Lock
          className={cn(
            "ml-auto size-3.5 shrink-0",
            active ? "text-white/80" : "text-ink-300",
          )}
          strokeWidth={2.2}
          aria-hidden
        />
      ) : null}
    </>
  );

  const shared = {
    className: navItemClassName(active, className),
    "aria-current": active ? ("page" as const) : undefined,
  };

  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...shared}>
        {body}
      </Link>
    );
  }

  return (
    <a href={href} {...shared}>
      {body}
    </a>
  );
}
