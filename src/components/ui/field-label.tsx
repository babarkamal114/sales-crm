import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FieldHelp } from "./field-help";
import { Label } from "./label";

export interface FieldLabelProps extends ComponentPropsWithoutRef<typeof Label> {
  help?: string;
  helpAriaLabel?: string;
  required?: boolean;
}

export const FieldLabel = forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ children, help, helpAriaLabel, required, className, ...props }, ref) => (
    <div className="mb-1.5 flex items-center gap-1">
      <Label ref={ref} className={cn("mb-0", className)} {...props}>
        {children}
        {required ? (
          <span className="ml-0.5 font-bold text-rose-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {help ? (
        <FieldHelp
          content={help}
          label={helpAriaLabel ?? `Help: ${typeof children === "string" ? children : "field"}`}
        />
      ) : null}
    </div>
  ),
);

FieldLabel.displayName = "FieldLabel";
