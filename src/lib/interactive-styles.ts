import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared classes for clickable controls — use on raw buttons/links outside the design system.
 * Global CSS also sets cursor:pointer on native interactive elements.
 */
export const interactiveFocusClass =
  "rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

export const interactiveControlClass =
  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

export const textLinkClass = cn(
  interactiveControlClass,
  interactiveFocusClass,
  "font-semibold text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline",
);

export const iconActionClass = cn(
  interactiveControlClass,
  interactiveFocusClass,
  "inline-flex items-center justify-center rounded-lg text-ink-400 transition-colors duration-150 hover:bg-soft hover:text-ink-700 motion-reduce:transition-none",
);

export const ghostTextButtonClass = cn(
  interactiveControlClass,
  interactiveFocusClass,
  "rounded-2xl font-bold text-ink-400 transition-colors duration-150 hover:text-ink-700 motion-reduce:transition-none disabled:opacity-50",
);

export const filterChipClass = cn(
  interactiveControlClass,
  interactiveFocusClass,
  "rounded-xl2 border border-line/60 bg-white text-left shadow-panel transition-all duration-200 hover:shadow-float focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2",
);

export const navLinkClass = cn(
  interactiveControlClass,
  interactiveFocusClass,
  "rounded-2xl transition-colors duration-150 motion-reduce:transition-none",
);

export const tableRowInteractiveClass =
  "cursor-pointer transition-colors duration-150 hover:bg-soft focus-visible:bg-soft motion-reduce:transition-none";

export function tableRowKeyHandlers(onActivate: () => void) {
  return {
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
  };
}
