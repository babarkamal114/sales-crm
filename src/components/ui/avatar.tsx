import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "flex shrink-0 items-center justify-center font-bold",
  {
    variants: {
      variant: {
        identity:
          "rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white",
        contact:
          "rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-ink-500",
        accent: "rounded-full bg-brand-100 text-brand-700",
        overflow: "rounded-full bg-soft text-ink-500 ring-2 ring-white",
      },
      size: {
        lg: "size-12 text-[15px]",
        md: "size-10 text-[12px]",
        sm: "size-9 text-[11px]",
        xs: "size-8 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "contact",
      size: "md",
    },
  },
);

export interface AvatarProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  initials: string;
}

export function Avatar({
  initials,
  variant,
  size,
  className,
  ...props
}: AvatarProps) {
  return (
    <span
      className={cn(avatarVariants({ variant, size }), className)}
      aria-hidden
      {...props}
    >
      {initials}
    </span>
  );
}

export interface AvatarStackProps {
  initials: string[];
  overflowCount?: number;
  className?: string;
}

export function AvatarStack({
  initials,
  overflowCount,
  className,
}: AvatarStackProps) {
  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {initials.map((item) => (
        <Avatar
          key={item}
          initials={item}
          variant="overflow"
          size="sm"
        />
      ))}
      {overflowCount !== undefined && overflowCount > 0 ? (
        <Avatar
          initials={`+${overflowCount}`}
          variant="overflow"
          size="sm"
          className="text-[10.5px]"
        />
      ) : null}
    </div>
  );
}

export interface AvatarWithStatusProps extends AvatarProps {
  statusTone?: "clear" | "risk" | "action";
}

const statusDotStyles = {
  clear: "bg-mint-600",
  risk: "bg-amber-600",
  action: "bg-rose-600",
} as const;

export function AvatarWithStatus({
  statusTone = "clear",
  className,
  ...props
}: AvatarWithStatusProps) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar {...props} />
      <span
        className={cn(
          "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white",
          statusDotStyles[statusTone],
        )}
        aria-hidden
      />
    </div>
  );
}
