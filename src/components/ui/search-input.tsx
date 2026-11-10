import { Search } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, hasError, ...props }, ref) => (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-300"
        strokeWidth={2}
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        className={cn(
          "h-11 w-full rounded-2xl border bg-white pr-4 pl-11 text-[13.5px] transition-colors placeholder:text-ink-300 focus:border-brand-300",
          hasError
            ? "border-rose-200 focus:border-rose-300"
            : "border-line",
          className,
        )}
        {...props}
      />
    </div>
  ),
);

SearchInput.displayName = "SearchInput";
