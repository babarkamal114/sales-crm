"use client";

import { Toaster as Sonner, toast } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      offset={{ top: 88 }}
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-line bg-white shadow-auth-float font-sans text-ink-900",
          title: "text-[13px] font-bold",
          description: "text-[12px] font-medium text-ink-500",
          actionButton:
            "rounded-xl bg-brand-500 text-white text-[12px] font-bold",
          cancelButton:
            "rounded-xl border border-line bg-white text-[12px] font-semibold text-ink-700",
        },
      }}
    />
  );
}

export { toast };
