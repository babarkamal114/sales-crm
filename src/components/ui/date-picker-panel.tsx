"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildCalendarMonthGrid,
  CALENDAR_MONTH_LABELS,
  CALENDAR_WEEKDAY_LABELS,
  clampViewMonth,
  compareIsoDates,
  formatIsoDateLabel,
  getCalendarYearRange,
  isIsoDateInRange,
  parseIsoDate,
  todayIsoDate,
  toIsoDate,
} from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Select } from "./select";

export interface DatePickerPanelProps {
  value?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  onSelect: (isoDate: string) => void;
  onClear?: (() => void) | undefined;
}

export function DatePickerPanel({
  value,
  min,
  max,
  onSelect,
  onClear,
}: DatePickerPanelProps) {
  const parsedValue = parseIsoDate(value);
  const initialView = clampViewMonth({
    year: parsedValue?.year ?? new Date().getFullYear(),
    month: parsedValue?.month ?? new Date().getMonth() + 1,
    min,
    max,
  });

  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const valueKey = value ?? "";
  const [syncedValueKey, setSyncedValueKey] = useState(valueKey);

  if (valueKey !== syncedValueKey) {
    setSyncedValueKey(valueKey);
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }

  const { minYear, maxYear } = useMemo(
    () => getCalendarYearRange({ min, max }),
    [min, max],
  );

  const monthGrid = useMemo(
    () => buildCalendarMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const today = todayIsoDate();

  function shiftMonth(delta: number) {
    const next = shiftMonthValues(viewYear, viewMonth, delta);
    const clamped = clampViewMonth({ year: next.year, month: next.month, min, max });
    setViewYear(clamped.year);
    setViewMonth(clamped.month);
  }

  function handleMonthChange(nextMonth: number) {
    const clamped = clampViewMonth({ year: viewYear, month: nextMonth, min, max });
    setViewYear(clamped.year);
    setViewMonth(clamped.month);
  }

  function handleYearChange(nextYear: number) {
    const clamped = clampViewMonth({ year: nextYear, month: viewMonth, min, max });
    setViewYear(clamped.year);
    setViewMonth(clamped.month);
  }

  const previous = shiftMonthValues(viewYear, viewMonth, -1);
  const next = shiftMonthValues(viewYear, viewMonth, 1);
  const previousMonthLastDay = new Date(previous.year, previous.month, 0).getDate();
  const canGoBack =
    !min || compareIsoDates(toIsoDate(previous.year, previous.month, previousMonthLastDay), min) >= 0;
  const canGoForward =
    !max || compareIsoDates(toIsoDate(next.year, next.month, 1), max) <= 0;

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="icon"
          size="icon"
          className="size-9 shrink-0 rounded-xl"
          disabled={!canGoBack}
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="size-4" strokeWidth={2.2} />
        </Button>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <Select
            value={String(viewMonth)}
            aria-label="Month"
            className="min-w-0 text-[12.5px]"
            onChange={(event) => handleMonthChange(Number(event.target.value))}
          >
            {CALENDAR_MONTH_LABELS.map((label, index) => (
              <option key={label} value={String(index + 1)}>
                {label}
              </option>
            ))}
          </Select>

          <Select
            value={String(viewYear)}
            aria-label="Year"
            className="min-w-0 text-[12.5px]"
            onChange={(event) => handleYearChange(Number(event.target.value))}
          >
            {Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).map(
              (year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ),
            )}
          </Select>
        </div>

        <Button
          type="button"
          variant="icon"
          size="icon"
          className="size-9 shrink-0 rounded-xl"
          disabled={!canGoForward}
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" strokeWidth={2.2} />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {CALENDAR_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10.5px] font-bold tracking-wide text-ink-400 uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthGrid.map((cell, index) => {
          if (!cell.iso || cell.day == null) {
            return <span key={`empty-${index}`} className="size-9" aria-hidden />;
          }

          const selected = cell.iso === value;
          const disabled = !isIsoDateInRange(cell.iso, min, max);
          const isToday = cell.iso === today;

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              aria-label={formatIsoDateLabel(cell.iso)}
              aria-pressed={selected}
              className={cn(
                "size-9 rounded-xl text-[12.5px] font-semibold transition-colors",
                selected
                  ? "bg-brand-500 text-white shadow-chip hover:bg-brand-600"
                  : "text-ink-700 hover:bg-soft",
                isToday && !selected && "ring-1 ring-brand-200",
                disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
              )}
              onClick={() => onSelect(cell.iso!)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2.5"
          disabled={!isIsoDateInRange(today, min, max)}
          onClick={() => onSelect(today)}
        >
          Today
        </Button>
        {onClear ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5" onClick={onClear}>
            Clear
          </Button>
        ) : (
          <span className="text-[11px] font-medium text-ink-400">
            {value ? formatIsoDateLabel(value) : "No date selected"}
          </span>
        )}
      </div>
    </div>
  );
}

function shiftMonthValues(year: number, month: number, delta: number) {
  let nextMonth = month + delta;
  let nextYear = year;

  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }

  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }

  return { year: nextYear, month: nextMonth };
}
