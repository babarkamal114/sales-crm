import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full resize-y rounded-2xl border bg-white px-4 py-3 text-[13.5px] leading-relaxed transition-colors placeholder:text-ink-300 focus:border-brand-300",
        hasError
          ? "border-rose-200 focus:border-rose-300"
          : "border-line",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
