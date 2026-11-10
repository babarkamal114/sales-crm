import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { FieldHelp } from "./field-help";

export const Switch = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-ink-300 px-0.5 transition-colors data-[state=checked]:bg-brand-500",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = "Switch";

export function SwitchField({
  label,
  id,
  help,
  helpAriaLabel,
  ...props
}: ComponentPropsWithoutRef<typeof Switch> & {
  label: string;
  id: string;
  help?: string;
  helpAriaLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Switch id={id} {...props} />
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="cursor-pointer text-[13px] font-semibold">
          {label}
        </label>
        {help ? (
          <FieldHelp
            content={help}
            label={helpAriaLabel ?? `Help: ${label}`}
          />
        ) : null}
      </div>
    </div>
  );
}
