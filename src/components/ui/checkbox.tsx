import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center gap-2"
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "size-[18px] rounded-md border-line text-brand-500 focus:ring-brand-200",
            className,
          )}
          {...props}
        />
        <span className="text-[13px] font-semibold">{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? `${props.name}-${label}`;

    return (
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center gap-2"
      >
        <input
          ref={ref}
          id={inputId}
          type="radio"
          className={cn(
            "size-[18px] text-brand-500 focus:ring-brand-200",
            className,
          )}
          {...props}
        />
        <span className="text-[13px] font-semibold">{label}</span>
      </label>
    );
  },
);

Radio.displayName = "Radio";
