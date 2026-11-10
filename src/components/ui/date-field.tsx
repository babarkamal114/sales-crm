"use client";

import { Calendar, ChevronDown } from "lucide-react";
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { formatIsoDateLabel } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import { DatePickerPanel } from "./date-picker-panel";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DateFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  hasError?: boolean;
  value?: string;
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  (
    {
      className,
      hasError,
      value = "",
      onChange,
      min,
      max,
      disabled,
      id,
      name,
      placeholder = "Select date",
    },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);

    function setRefs(node: HTMLInputElement | null) {
      hiddenInputRef.current = node;

      if (typeof ref === "function") {
        ref(node);
        return;
      }

      if (ref) {
        ref.current = node;
      }
    }

    function emitChange(nextValue: string) {
      const target = hiddenInputRef.current;
      if (!target) {
        return;
      }

      target.value = nextValue;

      onChange?.({
        target,
        currentTarget: target,
      } as ChangeEvent<HTMLInputElement>);
    }

    const displayLabel = formatIsoDateLabel(value) || placeholder;
    const hasValue = Boolean(value);

    return (
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            id={fieldId}
            type="button"
            disabled={disabled}
            aria-haspopup="dialog"
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-[13.5px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              hasError
                ? "border-rose-200 focus-visible:outline-rose-400"
                : "border-line hover:border-brand-200",
              !hasValue && "text-ink-300",
              disabled && "cursor-not-allowed opacity-50",
              className,
            )}
          >
            <span className={cn("truncate", hasValue ? "font-medium text-ink-800" : "")}>
              {displayLabel}
            </span>
            <span className="ml-3 flex shrink-0 items-center gap-1 text-ink-400">
              <Calendar className="size-4" strokeWidth={2} aria-hidden />
              <ChevronDown className="size-3.5" strokeWidth={2.4} aria-hidden />
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[min(100vw-2rem,320px)] p-0">
          <DatePickerPanel
            value={value}
            min={typeof min === "string" ? min : undefined}
            max={typeof max === "string" ? max : undefined}
            onSelect={(isoDate) => {
              emitChange(isoDate);
              setOpen(false);
            }}
            onClear={() => {
              emitChange("");
              setOpen(false);
            }}
          />
        </PopoverContent>

        <input
          ref={setRefs}
          type="hidden"
          name={name}
          value={value}
          min={min}
          max={max}
          readOnly
          tabIndex={-1}
          aria-hidden
        />
      </Popover>
    );
  },
);

DateField.displayName = "DateField";
