"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

const OTP_SLOT_CLASS = {
  md: "h-11 w-11 text-[17px] font-bold",
  lg: "h-12 w-11 text-[18px] font-bold xl:h-[50px] xl:w-12 xl:text-[19px]",
} as const;

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  className?: string;
  size?: keyof typeof OTP_SLOT_CLASS;
  "aria-label"?: string;
}

function normalizeOtpValue(raw: string, length: number): string {
  return raw.replace(/\D/g, "").slice(0, length);
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
  autoFocus = false,
  id,
  name,
  className,
  size = "md",
  "aria-label": ariaLabel = "One-time code",
}: OtpInputProps) {
  const generatedId = useId();
  const groupId = id ?? generatedId;
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusSlot = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select();
  }, [length]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      focusSlot(0);
    }
  }, [autoFocus, disabled, focusSlot]);

  function commitDigits(nextDigits: string[]) {
    onChange(nextDigits.join("").slice(0, length));
  }

  function handleChange(index: number, nextChar: string) {
    const digit = normalizeOtpValue(nextChar, 1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    commitDigits(nextDigits);

    if (digit && index < length - 1) {
      focusSlot(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();

      if (digits[index]) {
        const nextDigits = [...digits];
        nextDigits[index] = "";
        commitDigits(nextDigits);
        return;
      }

      if (index > 0) {
        const nextDigits = [...digits];
        nextDigits[index - 1] = "";
        commitDigits(nextDigits);
        focusSlot(index - 1);
      }

      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusSlot(index - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusSlot(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = normalizeOtpValue(event.clipboardData.getData("text"), length);

    if (!pasted) {
      return;
    }

    onChange(pasted);
    focusSlot(Math.min(pasted.length, length - 1));
  }

  return (
    <div
      id={groupId}
      role="group"
      aria-label={ariaLabel}
      className={cn("flex items-center justify-start gap-1.5 sm:gap-2", className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          id={index === 0 ? groupId : undefined}
          name={index === 0 ? name : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={cn(
            "rounded-2xl border bg-white text-center tracking-[0.2em] text-ink-900 transition-colors focus:border-brand-300 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            OTP_SLOT_CLASS[size],
            hasError ? "border-rose-200 focus:border-rose-300" : "border-line",
            size === "lg" && "bg-soft/30",
          )}
        />
      ))}
    </div>
  );
}
