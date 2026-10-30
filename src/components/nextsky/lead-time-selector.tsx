"use client";

import { cn } from "@/lib/utils";

interface LeadTimeSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const LEAD_TIMES = [
  { value: 1, label: "T+15", minutes: 15 },
  { value: 2, label: "T+30", minutes: 30 },
  { value: 3, label: "T+45", minutes: 45 },
  { value: 4, label: "T+60", minutes: 60 },
  { value: 5, label: "T+75", minutes: 75 },
  { value: 6, label: "T+90", minutes: 90 },
];

export function LeadTimeSelector({
  value,
  onChange,
  disabled,
}: LeadTimeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Forecast Horizon
        </h3>
        <span className="text-xs font-mono text-primary">
          {LEAD_TIMES.find((lt) => lt.value === value)?.label} (
          {LEAD_TIMES.find((lt) => lt.value === value)?.minutes} min)
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Slider */}
        <input
          type="range"
          min={1}
          max={6}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-secondary",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-primary",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-transform",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-primary",
            "[&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />

        {/* Toggle buttons */}
        <div className="grid grid-cols-6 gap-1">
          {LEAD_TIMES.map((lt) => (
            <button
              key={lt.value}
              type="button"
              onClick={() => onChange(lt.value)}
              disabled={disabled}
              className={cn(
                "py-2 px-1 text-xs font-mono rounded transition-all",
                value === lt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {lt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
