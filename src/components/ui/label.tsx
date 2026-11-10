import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("mb-1.5 block text-[12px] font-bold", className)}
    {...props}
  />
));

Label.displayName = "Label";

export const FieldError = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    role="alert"
    data-field-error=""
    className={cn("mt-1.5 text-[11.5px] font-semibold text-rose-600", className)}
    {...props}
  />
);

export const FieldHint = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("mt-1.5 text-[11.5px] font-medium text-ink-400", className)}
    {...props}
  />
);
