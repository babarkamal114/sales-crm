import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "rounded-2xl bg-brand-500 text-white shadow-chip hover:bg-brand-600",
        dark: "rounded-2xl bg-ink-900 font-bold text-white hover:bg-ink-700",
        secondary:
          "rounded-2xl border border-line bg-white text-ink-700 shadow-chip hover:border-ink-300",
        ghost:
          "rounded-2xl bg-soft text-ink-500 hover:text-ink-900",
        destructive:
          "rounded-2xl bg-rose-50 font-bold text-rose-600 hover:bg-rose-100",
        icon: "rounded-2xl border border-line bg-white text-ink-500 shadow-chip hover:text-ink-900",
      },
      size: {
        default: "h-10 px-4 text-[13px]",
        sm: "h-9 rounded-xl px-3.5 text-[12px] font-bold",
        compact: "h-8 rounded-full px-3.5 text-[12px]",
        icon: "size-10",
      },
    },
    compoundVariants: [
      {
        variant: "dark",
        size: "compact",
        className: "font-bold",
      },
      {
        variant: "ghost",
        size: "compact",
        className: "font-semibold",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };
