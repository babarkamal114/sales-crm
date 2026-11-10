import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-bold",
  {
    variants: {
      variant: {
        default: "rounded-full bg-soft px-2.5 py-1 text-[11px] text-ink-500",
        category:
          "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide text-white",
        count: "min-h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10.5px] tnum",
        live: "gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] text-brand-700",
      },
      tone: {
        rose: "bg-rose-50 text-rose-600",
        amber: "bg-amber-50 text-amber-700",
        mint: "bg-mint-50 text-mint-700",
        brand: "bg-brand-50 text-brand-700",
        neutral: "bg-soft text-ink-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, tone, className }))} {...props} />
  );
}

export { badgeVariants };
