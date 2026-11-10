import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-2xl border bg-white px-4 text-[13.5px] transition-colors placeholder:text-ink-300 focus:border-brand-300",
        hasError
          ? "border-rose-200 focus:border-rose-300"
          : "border-line",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
