import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { textLinkClass } from "@/lib/interactive-styles";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-xl2 border border-line/60 bg-white shadow-panel",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between px-5 pt-4 pb-3",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-[15px] font-bold", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardAction = forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(textLinkClass, "text-[12.5px] font-bold hover:no-underline", className)}
    {...props}
  />
));
CardAction.displayName = "CardAction";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-5 pb-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

export interface InteractiveCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
}

export function InteractiveCard({
  icon,
  title,
  className,
  children,
  ...props
}: InteractiveCardProps) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-xl2 border border-line/60 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float",
        className,
      )}
      {...props}
    >
      <div className="mb-2 flex items-center gap-2">
        {icon ? (
          <span className="flex size-6 items-center justify-center rounded-lg bg-brand-50">
            {icon}
          </span>
        ) : null}
        <h3 className="text-[15px] font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
