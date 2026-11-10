/** Status tones — colour always means something in this product. */
export type StatusTone = "clear" | "risk" | "action" | "neutral" | "brand";

export const statusToneStyles: Record<
  StatusTone,
  { badge: string; dot: string; text: string }
> = {
  clear: {
    badge: "bg-mint-50 text-mint-700",
    dot: "bg-mint-600",
    text: "text-mint-700",
  },
  risk: {
    badge: "bg-amber-50 text-amber-700",
    dot: "bg-amber-600",
    text: "text-amber-700",
  },
  action: {
    badge: "bg-rose-50 text-rose-600",
    dot: "bg-rose-600",
    text: "text-rose-600",
  },
  neutral: {
    badge: "bg-soft text-ink-500",
    dot: "bg-ink-300",
    text: "text-ink-500",
  },
  brand: {
    badge: "bg-brand-50 text-brand-700",
    dot: "bg-brand-500",
    text: "text-brand-700",
  },
};
